package com.solventa.feature.siniestros

import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.ResumenCobertura
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPolizas
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.billetera.dominio.Cobertura
import com.solventa.feature.billetera.dominio.PolizaDetalle
import com.solventa.feature.siniestros.dominio.EnvioSiniestro
import com.solventa.feature.siniestros.dominio.PaginaSiniestros
import com.solventa.feature.siniestros.dominio.Borrador
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.BorradorResumen
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.ImportadorEvidencias
import com.solventa.feature.siniestros.dominio.ArchivoImportado
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import androidx.lifecycle.ViewModel
import app.cash.turbine.test
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.coVerifyOrder
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import java.io.File
import java.time.LocalDate
import java.time.OffsetDateTime
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SiniestrosViewModelTest {
    private val repositorio = mockk<RepositorioSiniestros>()
    private val repositorioPolizas = mockk<RepositorioPolizas>()
    private val almacen = mockk<com.solventa.feature.siniestros.dominio.AlmacenEvidencias>(relaxed = true)
    private val gestorSesion = mockk<GestorSesion>(relaxed = true)
    private val pendientes = AlmacenPendientesFalso()
    private val limites = LimitesSiniestros(
        maxEvidencias = 1,
        reglasUbicacion = com.solventa.feature.siniestros.dominio.ReglasUbicacion(false, emptyList(), 100.0),
        formatosFoto = listOf("image/jpeg", "image/png"),
        formatosVideo = listOf("video/mp4"),
        tamanoMaximoFotoBytes = 10,
        tamanoMaximoVideoBytes = 20,
        duracionMaximaVideoSegundos = 60,
        urlCargaExpiraSegundos = 300,
    )

    @BeforeEach
    fun configurarMain() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        coEvery { repositorio.limites() } returns Resultado.Exito(limites)
        coEvery { repositorio.listar() } returns Resultado.Exito(emptyList())
        coEvery { repositorio.historial(any()) } returns Resultado.Exito(PaginaSiniestros(emptyList(), null))
        val detallePoliza = mockk<PolizaDetalle>()
        every { detallePoliza.estado } returns "ACTIVA"
        every { detallePoliza.vigente } returns true
        every { detallePoliza.coberturas } returns listOf(Cobertura("DANOS", "Danos del vehiculo", false))
        every { detallePoliza.vigencia } returns Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31"))
        coEvery { repositorioPolizas.detalle(any()) } returns ResultadoPolizas.Exito(detallePoliza)
        coEvery { repositorio.detalle(any()) } answers { Resultado.Exito(detalle(firstArg())) }
        coEvery { repositorio.actualizar(any(), any(), any(), any()) } answers { Resultado.Exito(detalle(firstArg())) }
        coEvery { repositorio.agregarEvidencia(any(), any(), any()) } returns Resultado.Exito(evidencia())
        coEvery { repositorio.enviar(any(), any()) } answers { Resultado.Exito(envio(firstArg())) }
        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Exito(
            listOf(
                poliza("vigente", "ACTIVA", true),
                poliza("vencida", "ACTIVA", false),
                poliza("emitida", "EMITIDA", true),
                poliza("en-emision", "EMITIENDO", true),
            ),
        )
    }

    @AfterEach
    fun restaurarMain() {
        Dispatchers.resetMain()
    }

    @Test
    fun `sin conexion guarda pendiente y lo restaura tras reiniciar para envio manual`() = runTest {
        coEvery { repositorio.crearBorrador("vigente", "Choque", any()) } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.SinConexion),
            Resultado.Exito(Borrador("borrador-1", "vigente", "ABIERTO")),
        )
        val primero = crearViewModel()
        primero.seleccionarPoliza("vigente")
        primero.cambiarDescripcion("Choque")
        completar(primero)
        primero.reportar()
        assertEquals(FalloSiniestros.SinConexion, primero.uiState.value.falloFormulario)
        assertTrue(primero.uiState.value.pendienteGuardadoLocal)
        assertEquals(1, pendientes.guardados.size)
        val id = pendientes.guardados.keys.single()
        assertEquals("clave-fija", pendientes.guardados[id]?.claveCreacion)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }

        val segundo = crearViewModel()
        assertEquals(id, segundo.uiState.value.pendientesLocales.single().id)
        segundo.abrirPendienteLocal(id)
        assertEquals("Choque", segundo.uiState.value.descripcion)
        assertEquals(1, segundo.uiState.value.evidencias.size)
        assertTrue(segundo.uiState.value.descripcionBloqueada)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
        segundo.reportar()
        assertEquals(envio("borrador-1"), segundo.uiState.value.envioConfirmado)
        assertTrue(pendientes.guardados.isEmpty())
        coVerify(exactly = 2) { repositorio.crearBorrador("vigente", "Choque", "clave-fija") }
        coVerify(exactly = 1) { repositorio.enviar("borrador-1", any()) }
    }

    @Test
    fun `si falla almacenamiento protegido no inicia el envio ni informa guardado`() = runTest {
        pendientes.falloGuardado = FalloSiniestros.PendienteLocalNoDisponible
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        completar(viewModel)
        viewModel.reportar()
        assertEquals(FalloSiniestros.PendienteLocalNoDisponible, viewModel.uiState.value.falloFormulario)
        assertFalse(viewModel.uiState.value.pendienteGuardadoLocal)
        assertFalse(viewModel.uiState.value.enviando)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `rechaza archivo no admitido y no agrega evidencia`() = runTest {
        val importador = mockk<ImportadorEvidencias>()
        coEvery { importador.importar(any(), any()) } returns Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
        val viewModel = crearViewModel(importador)
        viewModel.adjuntarArchivo("content://prueba/documento")
        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        assertEquals(FalloSiniestros.EvidenciaNoAdmitida, viewModel.uiState.value.falloFormulario)
    }

    @Test
    fun `conserva metadata importada y comunica limite al intentar adjuntar otra`() = runTest {
        val importador = mockk<ImportadorEvidencias>()
        val archivo = File("temporal.png")
        coEvery { importador.importar(any(), any()) } returns Resultado.Exito(
            ArchivoImportado(archivo, "original.png", TipoEvidencia.FOTOGRAFIA, "image/png", null),
        )
        val viewModel = crearViewModel(importador)
        viewModel.adjuntarArchivo("content://prueba/imagen")
        val evidencia = viewModel.uiState.value.evidencias.single()
        assertEquals("original.png", evidencia.nombreArchivo)
        assertEquals("image/png", evidencia.tipoContenido)
        assertNull(evidencia.capturadaEn)
        assertFalse(viewModel.prepararSeleccionArchivo())
        assertEquals(FalloSiniestros.LimiteEvidenciasAlcanzado, viewModel.uiState.value.falloFormulario)
        coVerify(exactly = 1) { importador.importar(any(), any()) }
    }

    @Test
    fun `no envia ni descarta mientras se copia un archivo`() = runTest {
        val importador = mockk<ImportadorEvidencias>()
        val resultado = CompletableDeferred<Resultado<ArchivoImportado>>()
        coEvery { importador.importar(any(), any()) } coAnswers { resultado.await() }
        val viewModel = crearViewModel(importador)
        viewModel.cambiarDescripcion("Conservar")
        viewModel.adjuntarArchivo("content://prueba/imagen")
        assertTrue(viewModel.uiState.value.importandoEvidencia)
        viewModel.reportar()
        viewModel.cancelarFormulario()
        assertEquals("Conservar", viewModel.uiState.value.descripcion)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
        resultado.complete(Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible))
        assertFalse(viewModel.uiState.value.importandoEvidencia)
    }

    @Test
    fun `nuevo reporte inicia con hora del sistema y no reemplaza la fecha corregida al seleccionar poliza`() = runTest {
        var instante = OffsetDateTime.parse("2026-11-16T22:10:02.123-05:00")
        val viewModel = crearViewModel { instante }
        viewModel.iniciarNuevoReporte()
        assertEquals(instante, OffsetDateTime.parse(viewModel.uiState.value.fechaEvento))

        val fechaEvento = "2026-11-15T10:00:00-05:00"
        viewModel.cambiarFechaEvento(fechaEvento)
        instante = instante.plusMinutes(5)
        viewModel.seleccionarPoliza("vigente")
        assertEquals(fechaEvento, viewModel.uiState.value.fechaEvento)

        viewModel.iniciarNuevoReporte()
        assertEquals(instante, OffsetDateTime.parse(viewModel.uiState.value.fechaEvento))
    }

    @Test
    fun `acceso a evidencia se solicita al tocar y emite archivo con accion elegida`() = runTest {
        val resumen = com.solventa.feature.siniestros.dominio.SiniestroResumen("siniestro", "88-2026-1000", "REPORTADO", "poliza", "fecha")
        val detalle = com.solventa.feature.siniestros.dominio.SiniestroDetalle(
            resumen, "Choque", "DANOS", "fecha",
            listOf(com.solventa.feature.siniestros.dominio.EvidenciaReporte("evidencia", "foto.jpg")), emptyList(),
        )
        val archivo = com.solventa.feature.siniestros.dominio.ArchivoEvidencia(File("foto.jpg"), "foto.jpg", "image/jpeg")
        coEvery { repositorio.siniestro("siniestro") } returns Resultado.Exito(detalle)
        val poliza = mockk<PolizaDetalle>()
        every { poliza.numero } returns "POL-01"
        coEvery { repositorioPolizas.detalle("poliza") } returns ResultadoPolizas.Exito(poliza)
        coEvery { repositorio.descargarEvidencia("siniestro", "evidencia", any()) } returns Resultado.Exito(archivo)
        val viewModel = crearViewModel()
        viewModel.consultarSiniestro("siniestro")
        coVerify(exactly = 0) { repositorio.descargarEvidencia(any(), any(), any()) }

        viewModel.eventos.test {
            viewModel.accederEvidencia("evidencia", File("cache"), guardar = false)
            assertEquals(EventoSiniestros.EvidenciaLista("siniestro", archivo, false), awaitItem())
            viewModel.accederEvidencia("evidencia", File("cache"), guardar = true)
            assertEquals(EventoSiniestros.EvidenciaLista("siniestro", archivo, true), awaitItem())
            assertEquals(archivo, viewModel.uiState.value.archivoPorGuardar)
        }
        assertNull(viewModel.uiState.value.descargandoEvidencia)
        assertEquals(detalle, viewModel.uiState.value.reporte)
    }

    @Test
    fun `acceso denegado no cierra sesion pero 401 aplica recuperacion sin bloquear detalle`() = runTest {
        val resumen = com.solventa.feature.siniestros.dominio.SiniestroResumen("siniestro", "88-2026-1000", "REPORTADO", "poliza", "fecha")
        val detalle = com.solventa.feature.siniestros.dominio.SiniestroDetalle(
            resumen, "Choque", "DANOS", "fecha",
            listOf(com.solventa.feature.siniestros.dominio.EvidenciaReporte("evidencia", "foto.jpg")), emptyList(),
        )
        coEvery { repositorio.siniestro("siniestro") } returns Resultado.Exito(detalle)
        val poliza = mockk<PolizaDetalle>()
        every { poliza.numero } returns "POL-01"
        coEvery { repositorioPolizas.detalle("poliza") } returns ResultadoPolizas.Exito(poliza)
        val viewModel = crearViewModel()
        viewModel.consultarSiniestro("siniestro")
        coEvery { repositorio.descargarEvidencia(any(), any(), any()) } returns Resultado.Fallo(FalloSiniestros.NoAutorizado)

        viewModel.eventos.test {
            viewModel.accederEvidencia("evidencia", File("cache"), guardar = false)
            expectNoEvents()
            io.mockk.coVerify(exactly = 0) { gestorSesion.cerrarSesion() }
            assertEquals(FalloSiniestros.NoAutorizado, viewModel.uiState.value.falloAccesoEvidencia)
            assertNull(viewModel.uiState.value.descargandoEvidencia)
            assertEquals(detalle, viewModel.uiState.value.reporte)

            coEvery { repositorio.descargarEvidencia(any(), any(), any()) } returns Resultado.Fallo(FalloSiniestros.SesionVencida)
            viewModel.accederEvidencia("evidencia", File("cache"), guardar = false)
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        io.mockk.coVerify(exactly = 1) { gestorSesion.cerrarSesion() }
        assertNull(viewModel.uiState.value.descargandoEvidencia)
    }

    @Test
    fun `solo permite seleccionar poliza activa y vigente`() = runTest {
        val viewModel = crearViewModel()

        assertEquals(listOf("vigente"), viewModel.uiState.value.polizasElegibles.map { it.polizaId })
        for (id in listOf("vencida", "emitida", "en-emision")) {
            viewModel.seleccionarPoliza(id)
            assertNull(viewModel.uiState.value.polizaSeleccionada)
        }
        viewModel.seleccionarPoliza("vigente")
        assertEquals("vigente", viewModel.uiState.value.polizaSeleccionada)
    }

    @Test
    fun `selector comprueba fechas en Colombia aunque el servicio marque las polizas como vigentes`() = runTest {
        val hoy = LocalDate.parse("2026-11-16")
        val base = poliza("base", "ACTIVA", true)
        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Exito(
            listOf(
                base.copy(polizaId = "vencida-por-fecha", vigencia = Vigencia(hoy.minusDays(5), hoy.minusDays(1))),
                base.copy(polizaId = "inicio-futuro", vigencia = Vigencia(hoy.plusDays(1), hoy.plusDays(5))),
                base.copy(polizaId = "empieza-hoy", vigencia = Vigencia(hoy, hoy.plusDays(5))),
                base.copy(polizaId = "vence-hoy", vigencia = Vigencia(hoy.minusDays(5), hoy)),
            ),
        )
        // Ya es 17 en UTC, pero sigue siendo 16 en Colombia.
        var instante = OffsetDateTime.parse("2026-11-17T04:59:59Z")
        val viewModel = crearViewModel { instante }

        assertEquals(listOf("empieza-hoy", "vence-hoy"), viewModel.uiState.value.polizasElegibles.map { it.polizaId })
        viewModel.seleccionarPoliza("vence-hoy")
        assertEquals("vence-hoy", viewModel.uiState.value.polizaSeleccionada)

        instante = instante.plusSeconds(1)
        viewModel.reportar()
        assertEquals(FalloSiniestros.PolizaNoVigente, viewModel.uiState.value.falloFormulario)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }

        viewModel.iniciarNuevoReporte()
        viewModel.seleccionarPoliza("vence-hoy")
        assertNull(viewModel.uiState.value.polizaSeleccionada)
        assertEquals(listOf("empieza-hoy"), viewModel.uiState.value.polizasElegibles.map { it.polizaId })
    }

    @Test
    fun `selector excluye una poliza si el detalle vencio aunque el listado la muestre vigente`() = runTest {
        val resumen = poliza("vencida-en-detalle", "ACTIVA", true)
        val detalleVencido = mockk<PolizaDetalle>()
        every { detalleVencido.estado } returns "ACTIVA"
        every { detalleVencido.vigente } returns true
        every { detalleVencido.vigencia } returns Vigencia(resumen.vigencia.desde, LocalDate.parse("2026-10-14"))
        coEvery { repositorioPolizas.detalle(resumen.polizaId) } returns ResultadoPolizas.Exito(detalleVencido)
        coEvery { repositorioPolizas.detalle("no-verificada") } returns ResultadoPolizas.Fallo(FalloPolizas.ServicioNoDisponible)
        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Exito(
            listOf(resumen, poliza("no-verificada", "ACTIVA", true), poliza("vigente", "ACTIVA", true)),
        )
        val viewModel = crearViewModel()

        assertEquals(listOf("vigente"), viewModel.uiState.value.polizasElegibles.map { it.polizaId })
        assertTrue(viewModel.uiState.value.errorValidacionPolizas)
        viewModel.seleccionarPoliza(resumen.polizaId)
        assertNull(viewModel.uiState.value.polizaSeleccionada)
    }

    @Test
    fun `error de polizas no invalida el flujo y sesion invalida emite login`() = runTest {
        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Fallo(FalloPolizas.ErrorGenerico)
        val viewModel = crearViewModel()
        assertTrue(viewModel.uiState.value.polizasElegibles.isEmpty())
        assertEquals(FalloSiniestros.RespuestaInvalida, viewModel.uiState.value.errorCarga)

        coEvery { repositorioPolizas.listar() } returns ResultadoPolizas.Fallo(FalloPolizas.SesionInvalida)
        val viewModelConSesionVencida = crearViewModel()
        viewModelConSesionVencida.eventos.test {
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `rechaza evidencia que excede limites y elimina el archivo temporal`() = runTest {
        val viewModel = crearViewModel()
        val archivoExcedido = mockk<File>()
        every { archivoExcedido.isFile } returns true
        every { archivoExcedido.length() } returns 11

        viewModel.agregarCaptura(archivoExcedido, TipoEvidencia.FOTOGRAFIA)

        assertEquals(FalloSiniestros.TamanoEvidenciaExcedido, viewModel.uiState.value.falloFormulario)
        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        io.mockk.verify { almacen.eliminar(archivoExcedido) }
    }

    @Test
    fun `rechaza archivo ausente vacio tipo desconocido y video sin duracion o fuera del limite`() = runTest {
        val viewModel = crearViewModel()
        val ausente = mockk<File>()
        every { ausente.isFile } returns false
        viewModel.agregarCaptura(ausente, TipoEvidencia.FOTOGRAFIA)
        assertEquals(FalloSiniestros.ArchivoNoDisponible, viewModel.uiState.value.falloFormulario)

        val vacio = mockk<File>()
        every { vacio.isFile } returns true
        every { vacio.length() } returns 0
        viewModel.agregarCaptura(vacio, TipoEvidencia.FOTOGRAFIA)
        assertEquals(FalloSiniestros.ArchivoNoDisponible, viewModel.uiState.value.falloFormulario)

        val desconocido = mockk<File>()
        every { desconocido.isFile } returns true
        every { desconocido.length() } returns 1
        viewModel.agregarCaptura(desconocido, TipoEvidencia.DESCONOCIDO)
        assertEquals(FalloSiniestros.EvidenciaNoAdmitida, viewModel.uiState.value.falloFormulario)

        val video = mockk<File>()
        every { video.isFile } returns true
        every { video.length() } returns 1
        viewModel.agregarCaptura(video, TipoEvidencia.VIDEO)
        assertEquals(FalloSiniestros.EvidenciaNoAdmitida, viewModel.uiState.value.falloFormulario)
        viewModel.agregarCaptura(video, TipoEvidencia.VIDEO, 61)
        assertEquals(FalloSiniestros.DuracionVideoExcedida, viewModel.uiState.value.falloFormulario)

        listOf(ausente, vacio, desconocido, video).forEach {
            io.mockk.verify { almacen.eliminar(it) }
        }
    }

    @Test
    fun `agrega evidencia valida y al llegar al maximo elimina la siguiente temporal`() = runTest {
        val viewModel = crearViewModel()
        val valida = mockk<File>()
        every { valida.isFile } returns true
        every { valida.length() } returns 10
        val excedente = mockk<File>()

        viewModel.agregarCaptura(valida, TipoEvidencia.FOTOGRAFIA)
        viewModel.agregarCaptura(excedente, TipoEvidencia.FOTOGRAFIA)

        assertEquals(1, viewModel.uiState.value.evidencias.size)
        assertEquals(FalloSiniestros.LimiteEvidenciasAlcanzado, viewModel.uiState.value.falloFormulario)
        io.mockk.verify { almacen.eliminar(excedente) }
    }

    @Test
    fun `reutiliza la misma clave de idempotencia ante un reintento de red`() = runTest {
        coEvery {
            repositorio.crearBorrador("vigente", "Choque en la vía", any())
        } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.SinConexion),
            Resultado.Exito(Borrador("borrador-1", "vigente", "ABIERTO")),
        )
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("  Choque en la vía  ")
        completar(viewModel)

        viewModel.reportar()
        assertFalse(viewModel.uiState.value.enviando)
        assertEquals(FalloSiniestros.SinConexion, viewModel.uiState.value.falloFormulario)
        viewModel.reportar()

        viewModel.eventos.test {
            assertEquals(EventoSiniestros.ReporteEnviado("siniestro-borrador-1"), awaitItem())
        }
        coVerify(exactly = 2) {
            repositorio.crearBorrador("vigente", "Choque en la vía", "clave-fija")
        }
    }

    @Test
    fun `reporte exitoso guarda datos carga evidencias y solo confirma tras el envio`() = runTest {
        val archivo = mockk<File>()
        every { archivo.isFile } returns true
        every { archivo.length() } returns 10
        coEvery {
            repositorio.crearBorrador("vigente", "Choque", any())
        } returns Resultado.Exito(Borrador("borrador-2", "vigente", "ABIERTO"))
        coEvery { repositorio.agregarEvidencia("borrador-2", any(), limites) } returns
            Resultado.Exito(
            Evidencia(
                "evidencia-1",
                "foto.jpg",
                TipoEvidencia.FOTOGRAFIA,
                "image/jpeg",
                10,
                EstadoCarga.CARGADA,
                null,
                null,
            ),
            )
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        viewModel.seleccionarCausa("DANOS")
        viewModel.cambiarFechaEvento("2026-11-15T10:00:00-05:00")
        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)

        viewModel.eventos.test {
            viewModel.reportar()
            assertEquals(EventoSiniestros.ReporteEnviado("siniestro-borrador-2"), awaitItem())
        }

        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        assertFalse(viewModel.uiState.value.enviando)
        io.mockk.verify { almacen.eliminar(archivo) }
        coVerifyOrder {
            repositorio.crearBorrador("vigente", "Choque", any())
            repositorio.actualizar("borrador-2", "Choque", "DANOS", "2026-11-15T10:00:00-05:00")
            repositorio.agregarEvidencia("borrador-2", any(), limites)
            repositorio.detalle("borrador-2")
            repositorio.enviar("borrador-2", any())
        }
    }

    @Test
    fun `reporte sin poliza o descripcion no llama al repositorio`() = runTest {
        val viewModel = crearViewModel()

        viewModel.reportar()
        assertEquals(FalloSiniestros.PolizaNoEncontrada, viewModel.uiState.value.falloFormulario)
        viewModel.seleccionarPoliza("vigente")
        viewModel.reportar()
        assertEquals(FalloSiniestros.DescripcionObligatoria, viewModel.uiState.value.falloFormulario)
        viewModel.cambiarDescripcion("   ")
        viewModel.reportar()
        assertEquals(FalloSiniestros.DescripcionObligatoria, viewModel.uiState.value.falloFormulario)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `sesion vencida al crear borrador cierra sesion y emite login`() = runTest {
        coEvery { repositorio.crearBorrador(any(), any(), any()) } returns
            Resultado.Fallo(FalloSiniestros.SesionVencida)
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        completar(viewModel)

        viewModel.eventos.test {
            viewModel.reportar()
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        assertEquals(FalloSiniestros.SesionVencida, viewModel.uiState.value.falloFormulario)
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `detalle con sesion vencida cierra sesion y emite login`() = runTest {
        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Fallo(FalloSiniestros.SesionVencida)
        val viewModel = crearViewModel()

        viewModel.eventos.test {
            viewModel.consultarDetalle("borrador-1")
            assertEquals(EventoSiniestros.IrALogin, awaitItem())
        }
        assertFalse(viewModel.uiState.value.cargandoDetalle)
        coVerify { gestorSesion.cerrarSesion() }
    }

    @Test
    fun `adjunta evidencia a un borrador existente sin crear otro`() = runTest {
        val archivo = mockk<File>()
        every { archivo.isFile } returns true
        every { archivo.length() } returns 10
        coEvery { repositorio.detalle("borrador-1") } returnsMany listOf(Resultado.Exito(
            BorradorDetalle(
                "borrador-1",
                "poliza-no-elegible",
                "Choque",
                "ABIERTO",
                "2026-11-16T22:10:02-05:00",
                0,
                0,
                emptyList(),
            ),
        ), Resultado.Exito(detalle("borrador-1")), Resultado.Exito(detalle("borrador-1")))
        coEvery { repositorio.agregarEvidencia("borrador-1", any(), limites) } returns
            Resultado.Exito(
                Evidencia(
                    "evidencia-1",
                    "foto.jpg",
                    TipoEvidencia.FOTOGRAFIA,
                    "image/jpeg",
                    10,
                    EstadoCarga.CARGADA,
                    null,
                    null,
                ),
            )
        val viewModel = crearViewModel()
        viewModel.consultarDetalle("borrador-1")

        assertTrue(viewModel.prepararAdjuntarEvidencia("borrador-1"))
        assertEquals("poliza-no-elegible", viewModel.uiState.value.polizaSeleccionada)
        assertFalse(viewModel.uiState.value.descripcionBloqueada)
        viewModel.seleccionarCausa("DANOS")
        viewModel.cambiarFechaEvento("2026-11-15T10:00:00-05:00")
        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)

        viewModel.eventos.test {
            viewModel.reportar()
            assertEquals(EventoSiniestros.ReporteEnviado("siniestro-borrador-1"), awaitItem())
        }

        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
        coVerify(exactly = 1) { repositorio.agregarEvidencia("borrador-1", any(), limites) }
        io.mockk.verify { almacen.eliminar(archivo) }
    }

    @Test
    fun `rechaza editar cerrado pero permite completar datos de borrador lleno`() = runTest {
        val viewModel = crearViewModel()
        coEvery { repositorio.detalle("borrador-cerrado") } returns Resultado.Exito(
            BorradorDetalle(
                "borrador-cerrado",
                "poliza-1",
                "Choque",
                "CERRADO",
                "2026-11-16T22:10:02-05:00",
                0,
                0,
                emptyList(),
            ),
        )
        coEvery { repositorio.detalle("borrador-lleno") } returns Resultado.Exito(
            BorradorDetalle(
                "borrador-lleno",
                "poliza-1",
                "Choque",
                "ABIERTO",
                "2026-11-16T22:10:02-05:00",
                limites.maxEvidencias,
                0,
                emptyList(),
            ),
        )

        viewModel.consultarDetalle("borrador-cerrado")
        assertFalse(viewModel.prepararAdjuntarEvidencia("borrador-cerrado"))
        viewModel.consultarDetalle("borrador-lleno")
        assertTrue(viewModel.prepararAdjuntarEvidencia("borrador-lleno"))
    }

    @Test
    fun `limites no disponibles impiden agregar y reportar evidencia`() = runTest {
        coEvery { repositorio.limites() } returns Resultado.Fallo(FalloSiniestros.RespuestaInvalida)
        val viewModel = crearViewModel()
        val archivo = mockk<File>()

        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        assertEquals(FalloSiniestros.RespuestaInvalida, viewModel.uiState.value.falloFormulario)
        io.mockk.verify { almacen.eliminar(archivo) }
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        viewModel.reportar()
        assertEquals(FalloSiniestros.RespuestaInvalida, viewModel.uiState.value.falloFormulario)
    }

    @Test
    fun `cancelar elimina temporales y limpia el formulario`() = runTest {
        val viewModel = crearViewModel()
        val archivo = mockk<File>()
        every { archivo.isFile } returns true
        every { archivo.length() } returns 2
        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")

        viewModel.cancelarFormulario()

        assertTrue(viewModel.uiState.value.evidencias.isEmpty())
        assertNull(viewModel.uiState.value.polizaSeleccionada)
        assertEquals("", viewModel.uiState.value.descripcion)
        io.mockk.verify { almacen.eliminar(archivo) }
    }

    @Test
    fun `factory crea el viewmodel esperado y rechaza tipos incompatibles`() {
        val factory = SiniestrosViewModelFactory(repositorio, repositorioPolizas, almacen, gestorSesion, almacenPendientes = pendientes)

        assertTrue(factory.create(SiniestrosViewModel::class.java) is SiniestrosViewModel)
        assertThrows(IllegalArgumentException::class.java) {
            factory.create(OtroViewModel::class.java)
        }
    }

    private class OtroViewModel : ViewModel()

    private fun evidencia() = Evidencia("evidencia", "foto.jpg", TipoEvidencia.FOTOGRAFIA, "image/jpeg", 2, EstadoCarga.CARGADA, null, null)

    private fun detalle(id: String) = BorradorDetalle(
        id, "vigente", "Choque", "ABIERTO", "2026-11-16T10:00:00-05:00", 1, 0, listOf(evidencia()),
        causa = "DANOS", fechaEvento = "2026-11-15T10:00:00-05:00",
    )

    private fun envio(id: String) = EnvioSiniestro(id, "siniestro-$id", "88-2026-1000", "REPORTADO", "2026-11-16T22:10:02-05:00")

    private fun completar(viewModel: SiniestrosViewModel) {
        viewModel.seleccionarCausa("DANOS")
        viewModel.cambiarFechaEvento("2026-11-15T10:00:00-05:00")
        val archivo = mockk<File>()
        every { archivo.isFile } returns true
        every { archivo.length() } returns 2
        viewModel.agregarCaptura(archivo, TipoEvidencia.FOTOGRAFIA)
    }

    @Test
    fun `timeout de envio reutiliza borrador y UUID incluso al recrear viewmodel`() = runTest {
        val claves = mutableListOf<String>()
        coEvery { repositorio.enviar("borrador-1", capture(claves)) } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.SinConexion),
            Resultado.Exito(envio("borrador-1")),
        )
        val primero = crearViewModel()
        primero.consultarDetalle("borrador-1")
        primero.prepararAdjuntarEvidencia("borrador-1")
        primero.reportar()
        assertEquals(FalloSiniestros.SinConexion, primero.uiState.value.falloFormulario)
        assertNull(primero.uiState.value.envioConfirmado)
        val segundo = crearViewModel()
        segundo.consultarDetalle("borrador-1")
        segundo.prepararAdjuntarEvidencia("borrador-1")
        segundo.reportar()
        assertEquals(envio("borrador-1"), segundo.uiState.value.envioConfirmado)
        assertEquals(2, claves.size)
        assertEquals(claves[0], claves[1])
        java.util.UUID.fromString(claves.first())
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `al restaurar pendiente recupera envio confirmado tras respuesta perdida sin reenviar`() = runTest {
        var desconectado = false
        coEvery { repositorio.detalle("borrador-1") } coAnswers {
            if (desconectado) Resultado.Fallo(FalloSiniestros.SinConexion)
            else Resultado.Exito(detalle("borrador-1"))
        }
        coEvery { repositorio.enviar("borrador-1", any()) } coAnswers {
            desconectado = true
            Resultado.Fallo(FalloSiniestros.SinConexion)
        }
        val primero = crearViewModel()
        primero.consultarDetalle("borrador-1")
        primero.prepararAdjuntarEvidencia("borrador-1")
        primero.reportar()
        val id = pendientes.guardados.keys.single()
        assertEquals(FalloSiniestros.SinConexion, primero.uiState.value.falloFormulario)

        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Exito(
            detalle("borrador-1").copy(estado = "CONVERTIDO", envio = envio("borrador-1")),
        )
        val segundo = crearViewModel()
        segundo.abrirPendienteLocal(id)
        assertEquals(envio("borrador-1"), segundo.uiState.value.envioConfirmado)
        assertTrue(pendientes.guardados.isEmpty())
        coVerify(exactly = 1) { repositorio.enviar("borrador-1", any()) }
    }

    @Test
    fun `recupera confirmacion perdida sin editar ni reenviar borrador convertido`() = runTest {
        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Exito(
            detalle("borrador-1").copy(estado = "CONVERTIDO", envio = envio("borrador-1")),
        )
        val viewModel = crearViewModel()
        viewModel.eventos.test {
            viewModel.consultarDetalle("borrador-1")
            assertEquals(EventoSiniestros.ReporteEnviado("siniestro-borrador-1"), awaitItem())
        }
        coVerify(exactly = 0) { repositorio.actualizar(any(), any(), any(), any()) }
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
    }

    @Test
    fun `valida causa fecha con zona futuro vigencia y evidencia antes de crear`() = runTest {
        val viewModel = crearViewModel()
        viewModel.seleccionarPoliza("vigente")
        viewModel.cambiarDescripcion("Choque")
        viewModel.seleccionarCausa("Danos del vehiculo")
        viewModel.reportar()
        assertEquals(FalloSiniestros.CausaObligatoria, viewModel.uiState.value.falloFormulario)
        viewModel.seleccionarCausa("DANOS")
        for (fecha in listOf("", "2026-11-15T10:00:00", "2027-01-01T10:00:00Z", "2025-12-31T23:59:00-05:00", "2026-11-17T10:00:00Z")) {
            viewModel.cambiarFechaEvento(fecha)
            viewModel.reportar()
            assertEquals(FalloSiniestros.FechaEventoInvalida, viewModel.uiState.value.falloFormulario)
        }
        viewModel.cambiarFechaEvento("2026-11-15T10:00:00-05:00")
        viewModel.reportar()
        assertEquals(FalloSiniestros.EvidenciaObligatoria, viewModel.uiState.value.falloFormulario)
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `pendientes impiden envio y conflicto recarga datos conservando borrador`() = runTest {
        val pendiente = detalle("borrador-1").copy(evidenciasPendientes = 1, evidencias = listOf(evidencia().copy(estadoCarga = EstadoCarga.PENDIENTE)))
        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Exito(pendiente)
        val viewModel = crearViewModel()
        viewModel.consultarDetalle("borrador-1")
        viewModel.prepararAdjuntarEvidencia("borrador-1")
        viewModel.reportar()
        assertEquals(FalloSiniestros.EvidenciaNoCargada, viewModel.uiState.value.falloFormulario)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }

        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Exito(detalle("borrador-1").copy(descripcion = "Corregida"))
        coEvery { repositorio.enviar("borrador-1", any()) } returns Resultado.Fallo(FalloSiniestros.BorradorModificado)
        viewModel.reportar()
        assertEquals("borrador-1", viewModel.uiState.value.borradorActualId)
        assertEquals("Corregida", viewModel.uiState.value.descripcion)
        assertEquals(FalloSiniestros.BorradorModificado, viewModel.uiState.value.falloFormulario)
        assertNull(viewModel.uiState.value.envioConfirmado)
    }

    @Test
    fun `timeout con envio confirmado recupera el radicado sin duplicar con doble pulsacion`() = runTest {
        val respuesta = kotlinx.coroutines.CompletableDeferred<Resultado<EnvioSiniestro>>()
        coEvery { repositorio.enviar("borrador-1", any()) } coAnswers { respuesta.await() }
        val viewModel = crearViewModel()
        viewModel.consultarDetalle("borrador-1")
        viewModel.prepararAdjuntarEvidencia("borrador-1")
        viewModel.reportar()
        viewModel.reportar()
        assertTrue(viewModel.uiState.value.enviando)
        coEvery { repositorio.detalle("borrador-1") } returns Resultado.Exito(
            detalle("borrador-1").copy(estado = "CONVERTIDO", envio = envio("borrador-1")),
        )
        respuesta.complete(Resultado.Fallo(FalloSiniestros.SinConexion))
        viewModel.eventos.test {
            assertEquals(EventoSiniestros.ReporteEnviado("siniestro-borrador-1"), awaitItem())
        }
        viewModel.reportar()
        coVerify(exactly = 1) { repositorio.enviar("borrador-1", any()) }
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
    }

    @Test
    fun `patch invalido conserva borrador editable y bloquea envio hasta corregir`() = runTest {
        coEvery { repositorio.actualizar(any(), any(), any(), any()) } returnsMany listOf(
            Resultado.Fallo(FalloSiniestros.SolicitudInvalida),
            Resultado.Exito(detalle("borrador-1")),
        )
        val viewModel = crearViewModel()
        viewModel.consultarDetalle("borrador-1")
        viewModel.prepararAdjuntarEvidencia("borrador-1")
        viewModel.reportar()
        assertFalse(viewModel.uiState.value.descripcionBloqueada)
        assertEquals(FalloSiniestros.SolicitudInvalida, viewModel.uiState.value.falloFormulario)
        assertNull(viewModel.uiState.value.envioConfirmado)
        coVerify(exactly = 0) { repositorio.enviar(any(), any()) }
        viewModel.cambiarDescripcion("Descripcion corregida")
        viewModel.cambiarFechaEvento("2026-11-14T09:00:00-05:00")
        viewModel.reportar()
        coVerify { repositorio.actualizar("borrador-1", "Descripcion corregida", "DANOS", "2026-11-14T09:00:00-05:00") }
        coVerify(exactly = 0) { repositorio.crearBorrador(any(), any(), any()) }
        assertEquals(envio("borrador-1"), viewModel.uiState.value.envioConfirmado)
    }

    @Test
    fun `historial pagina y conserva estados actuales sin mezclar borradores`() = runTest {
        val primero = com.solventa.feature.siniestros.dominio.SiniestroResumen("1", "88-2026-1000", "REPORTADO", "poliza", "fecha")
        val segundo = primero.copy(id = "2", codigo = "88-2026-1001", estado = "EN_EVALUACION")
        coEvery { repositorio.historial(null) } returns Resultado.Exito(PaginaSiniestros(listOf(primero), "pagina2"))
        coEvery { repositorio.historial("pagina2") } returns Resultado.Exito(PaginaSiniestros(listOf(segundo), null))
        val viewModel = crearViewModel()
        viewModel.cargarHistorial(mas = true)
        assertEquals(listOf(primero, segundo), viewModel.uiState.value.historial)
        assertNull(viewModel.uiState.value.siguienteCursor)
        assertTrue(viewModel.uiState.value.borradores.isEmpty())
    }

    private fun crearViewModel(importador: ImportadorEvidencias? = null, ahora: () -> OffsetDateTime = { OffsetDateTime.parse("2026-11-16T22:10:02-05:00") }) = SiniestrosViewModel(
        repositorio = repositorio,
        repositorioPolizas = repositorioPolizas,
        almacen = almacen,
        gestorSesion = gestorSesion,
        nuevaClave = { "clave-fija" },
        ahora = ahora,
        importadorEvidencias = importador,
        almacenPendientes = pendientes,
    )

    private fun poliza(id: String, estado: String, vigente: Boolean) = PolizaResumen(
        polizaId = id,
        numero = id,
        estado = estado,
        producto = "Auto",
        ramo = "Vehículos",
        vigencia = Vigencia(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-12-31")),
        vigente = vigente,
        resumenCobertura = ResumenCobertura(java.math.BigDecimal.ZERO, "COP", 1),
    )
}
