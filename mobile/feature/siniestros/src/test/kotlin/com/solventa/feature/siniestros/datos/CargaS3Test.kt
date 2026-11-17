package com.solventa.feature.siniestros.datos

import com.solventa.core.network.modelo.CargaDto
import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

class CargaS3Test {
    @TempDir
    lateinit var directorio: File

    private lateinit var servidor: MockWebServer
    private lateinit var cargaS3: CargaS3

    @BeforeEach
    fun iniciarServidor() {
        servidor = MockWebServer()
        servidor.start()
        cargaS3 = CargaS3.paraPruebas(OkHttpClient())
    }

    @AfterEach
    fun detenerServidor() {
        servidor.shutdown()
    }

    @Test
    fun `envia campos intactos y parte file al final sin JWT`() = runBlocking {
        servidor.enqueue(MockResponse().setResponseCode(204))
        val archivo = Files.write(directorio.toPath().resolve("foto.jpg"), byteArrayOf(1, 2, 3)).toFile()

        val resultado = cargaS3.subir(
            archivo,
            "image/jpeg",
            carga(campos = linkedMapOf("key" to "signed/key", "Content-Type" to "image/jpeg", "x-amz-meta-sha256" to "abcd")),
        )

        val solicitud = servidor.takeRequest()
        val cuerpo = solicitud.body.readUtf8()
        assertEquals(ResultadoCargaS3.Exito, resultado)
        assertEquals("POST", solicitud.method)
        assertEquals(null, solicitud.getHeader("Authorization"))
        assertTrue(cuerpo.contains("name=\"key\""))
        assertTrue(cuerpo.contains("signed/key"))
        assertTrue(cuerpo.contains("name=\"Content-Type\""))
        assertTrue(cuerpo.contains("image/jpeg"))
        assertTrue(cuerpo.contains("name=\"x-amz-meta-sha256\""))
        assertTrue(cuerpo.contains("abcd"))
        assertTrue(cuerpo.lastIndexOf("name=\"file\"") > cuerpo.lastIndexOf("name=\"x-amz-meta-sha256\""))
        assertTrue(cuerpo.contains("filename=\"foto.jpg\""))
    }

    @Test
    fun `señala firma expirada cuando S3 responde 403`() = runBlocking {
        servidor.enqueue(MockResponse().setResponseCode(403))

        val resultado = cargaS3.subir(
            archivo = Files.write(directorio.toPath().resolve("foto.jpg"), byteArrayOf(1)).toFile(),
            tipoContenido = "image/jpeg",
            carga = carga(),
        )

        assertEquals(ResultadoCargaS3.FirmaExpirada, resultado)
    }

    @Test
    fun `rechaza metodo diferente de POST sin hacer una solicitud`() = runBlocking {
        val resultado = cargaS3.subir(
            archivo = Files.write(directorio.toPath().resolve("foto.jpg"), byteArrayOf(1)).toFile(),
            tipoContenido = "image/jpeg",
            carga = carga(metodo = "PUT"),
        )

        assertEquals(ResultadoCargaS3.Fallo, resultado)
        assertEquals(0, servidor.requestCount)
    }

    private fun carga(
        metodo: String = "POST",
        campos: Map<String, String> = mapOf("key" to "signed/key"),
    ) = CargaDto(
        metodo = metodo,
        url = servidor.url("/upload").toString(),
        campos = campos,
        expiraEn = "2026-11-16T22:15:02-05:00",
    )
}
