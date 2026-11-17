package com.solventa.feature.siniestros.datos

import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

class CalcularMetadataEvidenciaTest {
    @TempDir
    lateinit var directorio: File

    private val calcular = CalcularMetadataEvidencia()

    @Test
    fun `acepta foto exactamente en el limite y calcula SHA-256 hexadecimal`() {
        val archivo = archivo("foto.jpg", "abc".toByteArray())

        val resultado = calcular(evidencia(archivo), limites(tamanoFoto = 3))

        assertTrue(resultado is Resultado.Exito)
        val metadata = (resultado as Resultado.Exito<MetadataEvidencia>).valor
        assertEquals(3L, metadata.tamanoBytes)
        assertEquals("image/jpeg", metadata.tipoContenido)
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", metadata.sha256)
        assertEquals(64, metadata.sha256.length)
    }

    @Test
    fun `rechaza foto un byte por encima del limite`() {
        val resultado = calcular(
            evidencia(archivo("foto.jpg", ByteArray(4))),
            limites(tamanoFoto = 3),
        )

        assertEquals(Resultado.Fallo(FalloSiniestros.TamanoEvidenciaExcedido), resultado)
    }

    @Test
    fun `rechaza tipo no admitido y formato MIME que no esta configurado`() {
        val foto = evidencia(archivo("foto.jpg", byteArrayOf(1)))
        val tipoNoAdmitido = calcular(foto.copy(tipo = TipoEvidencia.DESCONOCIDO), limites())
        val formatoNoAdmitido = calcular(foto, limites(formatosFoto = listOf("image/png")))

        assertEquals(Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida), tipoNoAdmitido)
        assertEquals(Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida), formatoNoAdmitido)
    }

    @Test
    fun `valida duracion y requiere duracion para video`() {
        val video = evidencia(archivo("video.mp4", byteArrayOf(1)), TipoEvidencia.VIDEO)

        val sinDuracion = calcular(video, limites())
        val excedida = calcular(video.copy(duracionSegundos = 61), limites())
        val valida = calcular(video.copy(duracionSegundos = 60), limites())

        assertEquals(Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida), sinDuracion)
        assertEquals(Resultado.Fallo(FalloSiniestros.DuracionVideoExcedida), excedida)
        assertTrue(valida is Resultado.Exito)
    }

    @Test
    fun `rechaza un archivo vacio`() {
        val resultado = calcular(evidencia(archivo("vacio.jpg", byteArrayOf())), limites())

        assertEquals(Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible), resultado)
    }

    private fun archivo(nombre: String, contenido: ByteArray): File =
        Files.write(directorio.toPath().resolve(nombre), contenido).toFile()

    private fun evidencia(
        archivo: File,
        tipo: TipoEvidencia = TipoEvidencia.FOTOGRAFIA,
    ) = EvidenciaTemporal(
        id = "temporal",
        archivo = archivo,
        tipo = tipo,
        capturadaEn = "2026-11-16T22:10:02-05:00",
        duracionSegundos = null,
    )

    private fun limites(
        tamanoFoto: Long = 1024,
        formatosFoto: List<String> = listOf("image/jpeg", "image/png"),
    ) = LimitesSiniestros(
        maxEvidencias = 10,
        formatosFoto = formatosFoto,
        formatosVideo = listOf("video/mp4"),
        tamanoMaximoFotoBytes = tamanoFoto,
        tamanoMaximoVideoBytes = 2048,
        duracionMaximaVideoSegundos = 60,
        urlCargaExpiraSegundos = 300,
    )
}
