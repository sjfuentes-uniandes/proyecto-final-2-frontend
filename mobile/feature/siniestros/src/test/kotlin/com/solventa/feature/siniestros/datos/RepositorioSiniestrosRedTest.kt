package com.solventa.feature.siniestros.datos

import com.solventa.core.network.ResultadoSiniestros
import com.solventa.core.network.SiniestrosCliente
import com.solventa.core.network.ErrorSiniestros
import com.solventa.core.network.modelo.BorradorDto
import com.solventa.core.network.modelo.BorradorDetalleDto
import com.solventa.core.network.modelo.BorradorResumenDto
import com.solventa.core.network.modelo.CargaDto
import com.solventa.core.network.modelo.CargaRenovadaDto
import com.solventa.core.network.modelo.EvidenciaBorradorDto
import com.solventa.core.network.modelo.EvidenciaConfirmadaDto
import com.solventa.core.network.modelo.EvidenciaDto
import com.solventa.core.network.modelo.LimitesSiniestrosDto
import com.solventa.core.network.modelo.ListadoBorradoresDto
import com.solventa.core.network.modelo.SolicitudFotoEvidenciaDto
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import kotlin.test.assertIs

class RepositorioSiniestrosRedTest {
    @TempDir
    lateinit var directorio: File

    private val cliente = mockk<SiniestrosCliente>()
    private val cargaS3 = mockk<CargaS3>()
    private val repositorio = RepositorioSiniestrosRed(cliente, cargaS3)
    private val carga = CargaDto("POST", "https://s3.invalid/upload", mapOf("key" to "presigned"), "2026-11-16T22:15:02-05:00")
    private val limites = LimitesSiniestros(
        maxEvidencias = 10,
        formatosFoto = listOf("image/jpeg", "image/png"),
        formatosVideo = listOf("video/mp4"),
        tamanoMaximoFotoBytes = 10,
        tamanoMaximoVideoBytes = 20,
        duracionMaximaVideoSegundos = 60,
        urlCargaExpiraSegundos = 300,
    )

    @BeforeEach
    fun preparar() {
        coEvery { cliente.detalle("borrador") } returns ResultadoSiniestros.Exito(detalle())
    }

    @Test
    fun `registra, carga y confirma una evidencia antes de marcarla como cargada`() = runBlocking {
        val archivo = archivo("abc")
        coEvery { cliente.agregarFoto("borrador", any()) } returns ResultadoSiniestros.Exito(evidenciaDto())
        coEvery { cargaS3.subir(archivo, "image/jpeg", carga) } returns ResultadoCargaS3.Exito
        coEvery { cliente.confirmar("borrador", "evidencia") } returns ResultadoSiniestros.Exito(
            EvidenciaConfirmadaDto("evidencia", "CARGADA", "2026-11-16T22:11:02-05:00"),
        )

        val resultado = repositorio.agregarEvidencia("borrador", temporal(archivo), limites)

        val evidencia = assertIs<Resultado.Exito<*>>(resultado).valor
        assertEquals(EstadoCarga.CARGADA, (evidencia as com.solventa.feature.siniestros.dominio.Evidencia).estadoCarga)
        coVerify {
            cliente.agregarFoto(
                "borrador",
                match<SolicitudFotoEvidenciaDto> {
                    it.tamanoBytes == 3L &&
                        it.sha256 == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" &&
                        it.tipoContenido == "image/jpeg"
                },
            )
        }
        coVerify(exactly = 1) { cliente.confirmar("borrador", "evidencia") }
    }

    @Test
    fun `no confirma evidencia cuando falla la carga directa a S3`() = runBlocking {
        val archivo = archivo("abc")
        coEvery { cliente.agregarFoto("borrador", any()) } returns ResultadoSiniestros.Exito(evidenciaDto())
        coEvery { cargaS3.subir(archivo, "image/jpeg", carga) } returns ResultadoCargaS3.Fallo

        val resultado = repositorio.agregarEvidencia("borrador", temporal(archivo), limites)

        assertEquals(Resultado.Fallo(FalloSiniestros.CargaS3Fallida), resultado)
        coVerify(exactly = 0) { cliente.confirmar(any(), any()) }
    }

    @Test
    fun `renueva la carga para evidencia pendiente existente y reintenta tras firma expirada`() = runBlocking {
        val archivo = archivo("abc")
        coEvery { cliente.detalle("borrador") } returns ResultadoSiniestros.Exito(
            detalle(
                listOf(
                    EvidenciaBorradorDto(
                        evidenciaId = "evidencia",
                        nombreArchivo = archivo.name,
                        tipo = "FOTOGRAFIA",
                        tipoContenido = "image/jpeg",
                        tamanoBytes = 3,
                        sha256 = SHA_ABC,
                        capturadaEn = "2026-11-16T22:10:02-05:00",
                        estadoCarga = "PENDIENTE",
                    ),
                ),
            ),
        )
        coEvery { cliente.renovar("borrador", "evidencia") } returns ResultadoSiniestros.Exito(
            CargaRenovadaDto("evidencia", "PENDIENTE", carga),
        )
        coEvery { cargaS3.subir(archivo, "image/jpeg", carga) } returnsMany listOf(
            ResultadoCargaS3.FirmaExpirada,
            ResultadoCargaS3.Exito,
        )
        coEvery { cliente.confirmar("borrador", "evidencia") } returns ResultadoSiniestros.Exito(
            EvidenciaConfirmadaDto("evidencia", "CARGADA", "2026-11-16T22:11:02-05:00"),
        )

        val resultado = repositorio.agregarEvidencia("borrador", temporal(archivo), limites)

        assertIs<Resultado.Exito<*>>(resultado)
        coVerify(exactly = 2) { cliente.renovar("borrador", "evidencia") }
        coVerify(exactly = 0) { cliente.agregarFoto(any(), any()) }
        coVerify(exactly = 2) { cargaS3.subir(archivo, "image/jpeg", carga) }
    }

    @Test
    fun `rechaza el archivo antes de llamar al BFF cuando supera el limite`() = runBlocking {
        val archivo = archivo("01234567890")

        val resultado = repositorio.agregarEvidencia("borrador", temporal(archivo), limites)

        assertEquals(Resultado.Fallo(FalloSiniestros.TamanoEvidenciaExcedido), resultado)
        coVerify(exactly = 0) { cliente.detalle(any()) }
    }

    @Test
    fun `mapea limites listado detalle y creacion del BFF al dominio`() = runBlocking {
        coEvery { cliente.limites() } returns ResultadoSiniestros.Exito(
            LimitesSiniestrosDto(10, listOf("image/jpeg"), listOf("video/mp4"), 10, 20, 60, 300),
        )
        coEvery { cliente.listar() } returns ResultadoSiniestros.Exito(
            ListadoBorradoresDto(
                listOf(
                    BorradorResumenDto("borrador", "poliza", "Choque", "ABIERTO", "fecha", 1, 0),
                ),
            ),
        )
        coEvery { cliente.detalle("borrador") } returns ResultadoSiniestros.Exito(
            detalle(
                listOf(
                    EvidenciaBorradorDto(
                        "evidencia",
                        "foto.jpg",
                        "TIPO_DESCONOCIDO",
                        "image/jpeg",
                        3,
                        SHA_ABC,
                        estadoCarga = "ESTADO_DESCONOCIDO",
                    ),
                ),
            ),
        )
        coEvery { cliente.crearBorrador("clave", any()) } returns ResultadoSiniestros.Exito(
            BorradorDto("borrador", "poliza", "ABIERTO"),
        )

        assertIs<Resultado.Exito<*>>(repositorio.limites())
        val listado = assertIs<Resultado.Exito<*>>(repositorio.listar()).valor as List<*>
        val borrador = assertIs<Resultado.Exito<*>>(repositorio.crearBorrador("poliza", "Choque", "clave")).valor
        val evidencia = (assertIs<Resultado.Exito<*>>(repositorio.detalle("borrador")).valor as BorradorDetalle)
            .evidencias.single()

        assertEquals("borrador", (listado.single() as com.solventa.feature.siniestros.dominio.BorradorResumen).id)
        assertEquals("borrador", (borrador as com.solventa.feature.siniestros.dominio.Borrador).id)
        assertEquals(TipoEvidencia.DESCONOCIDO, evidencia.tipo)
        assertEquals(com.solventa.feature.siniestros.dominio.EstadoCarga.DESCONOCIDO, evidencia.estadoCarga)
    }

    @Test
    fun `mapea codigos de error del BFF a fallos de dominio`() = runBlocking {
        val errores = listOf(
            ErrorSiniestros.SinConexion to FalloSiniestros.SinConexion,
            ErrorSiniestros.NoAutenticado to FalloSiniestros.SesionVencida,
            ErrorSiniestros.ClienteNoEncontrado to FalloSiniestros.SesionVencida,
            ErrorSiniestros.RolNoAutorizado to FalloSiniestros.NoAutorizado,
            ErrorSiniestros.PolizaNoAutorizada to FalloSiniestros.PolizaNoAutorizada,
            ErrorSiniestros.PolizaNoEncontrada to FalloSiniestros.PolizaNoEncontrada,
            ErrorSiniestros.BorradorNoEncontrado to FalloSiniestros.BorradorNoEncontrado,
            ErrorSiniestros.PolizaNoVigente to FalloSiniestros.PolizaNoVigente,
            ErrorSiniestros.SolicitudInvalida to FalloSiniestros.SolicitudInvalida,
            ErrorSiniestros.IdempotenciaConflicto to FalloSiniestros.IdempotenciaConflicto,
            ErrorSiniestros.TipoEvidenciaNoAdmitido to FalloSiniestros.TipoEvidenciaNoAdmitido,
            ErrorSiniestros.TamanoEvidenciaExcedido to FalloSiniestros.TamanoEvidenciaExcedido,
            ErrorSiniestros.DuracionVideoExcedida to FalloSiniestros.DuracionVideoExcedida,
            ErrorSiniestros.LimiteEvidenciasAlcanzado to FalloSiniestros.LimiteEvidenciasAlcanzado,
            ErrorSiniestros.EvidenciaNoCargada to FalloSiniestros.CargaS3Fallida,
            ErrorSiniestros.EvidenciaYaConfirmada to FalloSiniestros.RespuestaInvalida,
            ErrorSiniestros.IntegridadEvidenciaInvalida to FalloSiniestros.IntegridadEvidenciaInvalida,
            ErrorSiniestros.ServicioNoDisponible to FalloSiniestros.ServicioNoDisponible,
            ErrorSiniestros.Desconocido(500) to FalloSiniestros.RespuestaInvalida,
        )

        errores.forEach { (error, falloEsperado) ->
            coEvery { cliente.detalle("borrador") } returns ResultadoSiniestros.Fallo(error)

            assertEquals(Resultado.Fallo(falloEsperado), repositorio.detalle("borrador"))
        }
    }

    @Test
    fun `no consume carga ni crea otro registro cuando la evidencia ya esta confirmada`() = runBlocking {
        val archivo = archivo("abc")
        coEvery { cliente.detalle("borrador") } returns ResultadoSiniestros.Exito(
            detalle(
                listOf(
                    EvidenciaBorradorDto(
                        "evidencia",
                        archivo.name,
                        "FOTOGRAFIA",
                        "image/jpeg",
                        3,
                        SHA_ABC,
                        estadoCarga = "CARGADA",
                    ),
                ),
            ),
        )

        val resultado = repositorio.agregarEvidencia("borrador", temporal(archivo), limites)

        assertIs<Resultado.Exito<*>>(resultado)
        coVerify(exactly = 0) { cliente.agregarFoto(any(), any()) }
        coVerify(exactly = 0) { cargaS3.subir(any(), any(), any()) }
    }

    @Test
    fun `rechaza una evidencia nueva cuando el borrador ya alcanzo el maximo`() = runBlocking {
        val archivo = archivo("abc")
        coEvery { cliente.detalle("borrador") } returns ResultadoSiniestros.Exito(
            detalle(
                listOf(
                    EvidenciaBorradorDto("otra", "otra.jpg", "FOTOGRAFIA", "image/jpeg", 2, "otro-sha", estadoCarga = "CARGADA"),
                ),
            ),
        )

        val resultado = repositorio.agregarEvidencia("borrador", temporal(archivo), limites.copy(maxEvidencias = 1))

        assertEquals(Resultado.Fallo(FalloSiniestros.LimiteEvidenciasAlcanzado), resultado)
        coVerify(exactly = 0) { cliente.agregarFoto(any(), any()) }
    }

    @Test
    fun `registra video con duracion y confirma la carga`() = runBlocking {
        val archivo = Files.write(directorio.toPath().resolve("evidencia.mp4"), "video-content".toByteArray()).toFile()
        val evidenciaVideo = temporal(archivo).copy(tipo = TipoEvidencia.VIDEO, duracionSegundos = 60)
        val cargaVideo = evidenciaDto().copy(
            nombreArchivo = archivo.name,
            tipo = "VIDEO",
            tipoContenido = "video/mp4",
            tamanoBytes = archivo.length(),
            sha256 = "video-sha",
            carga = carga,
        )
        coEvery { cliente.agregarVideo("borrador", any()) } returns ResultadoSiniestros.Exito(cargaVideo)
        coEvery { cargaS3.subir(archivo, "video/mp4", carga) } returns ResultadoCargaS3.Exito
        coEvery { cliente.confirmar("borrador", "evidencia") } returns ResultadoSiniestros.Exito(
            EvidenciaConfirmadaDto("evidencia", "CARGADA", "fecha"),
        )

        val resultado = repositorio.agregarEvidencia("borrador", evidenciaVideo, limites)

        assertIs<Resultado.Exito<*>>(resultado)
        coVerify { cliente.agregarVideo("borrador", match { it.duracionSegundos == 60 }) }
    }

    private fun archivo(contenido: String): File =
        Files.write(directorio.toPath().resolve("foto.jpg"), contenido.toByteArray()).toFile()

    private fun temporal(archivo: File) = EvidenciaTemporal(
        id = "temporal",
        archivo = archivo,
        tipo = TipoEvidencia.FOTOGRAFIA,
        capturadaEn = "2026-11-16T22:10:02-05:00",
    )

    private fun detalle(evidencias: List<EvidenciaBorradorDto> = emptyList()) = BorradorDetalleDto(
        borradorId = "borrador",
        polizaId = "poliza",
        descripcion = "Choque",
        estado = "ABIERTO",
        creadoEn = "2026-11-16T22:10:02-05:00",
        cantidadEvidencias = evidencias.size,
        evidenciasPendientes = evidencias.count { it.estadoCarga == "PENDIENTE" },
        evidencias = evidencias,
    )

    private fun evidenciaDto() = EvidenciaDto(
        evidenciaId = "evidencia",
        nombreArchivo = "foto.jpg",
        tipo = "FOTOGRAFIA",
        tipoContenido = "image/jpeg",
        tamanoBytes = 3,
        sha256 = SHA_ABC,
        capturadaEn = "2026-11-16T22:10:02-05:00",
        estadoCarga = "PENDIENTE",
        carga = carga,
    )

    private companion object {
        const val SHA_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    }
}
