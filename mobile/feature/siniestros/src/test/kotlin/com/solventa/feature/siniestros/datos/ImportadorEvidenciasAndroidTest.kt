package com.solventa.feature.siniestros.datos

import android.app.Application
import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import java.io.File
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.util.Base64
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.shadows.ShadowContentResolver
import org.robolectric.shadows.ShadowMediaMetadataRetriever

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ImportadorEvidenciasAndroidTest {
    private val contexto = RuntimeEnvironment.getApplication()
    private val uri = Uri.parse("content://archivos-prueba/archivo")
    private val archivos = mutableListOf<File>()
    private val proveedor = ProveedorPrueba()
    private var duracionVideo: String? = null
    private val almacen = object : AlmacenEvidencias {
        override fun crearArchivo(extension: String): File =
            File.createTempFile("adjunto-", ".$extension", contexto.cacheDir).also {
                archivos.add(it)
                if (extension == "mp4") {
                    ShadowMediaMetadataRetriever.addMetadata(it.absolutePath, MediaMetadataRetriever.METADATA_KEY_MIMETYPE, "video/mp4")
                    duracionVideo?.let { duracion ->
                        ShadowMediaMetadataRetriever.addMetadata(it.absolutePath, MediaMetadataRetriever.METADATA_KEY_DURATION, duracion)
                    }
                }
            }

        override fun eliminar(archivo: File) {
            check(archivo.delete())
        }
    }
    private val importador = ImportadorEvidenciasAndroid(contexto, almacen)
    private val png = Base64.getDecoder().decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
    )
    private val limites = LimitesSiniestros(3, listOf("image/jpeg", "image/png"), listOf("video/mp4"), 1024, 1024, 60, 300)

    @Before
    fun preparar() {
        ShadowContentResolver.registerProviderInternal("archivos-prueba", proveedor)
    }

    @After
    fun limpiar() {
        archivos.filter { it.exists() }.forEach { check(it.delete()) }
    }

    @Test
    fun `rechaza PDF sin crear archivo temporal`() = runBlocking {
        proveedor.mime = "application/pdf"
        assertEquals(Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida), importador.importar(uri.toString(), limites))
        assertTrue(archivos.isEmpty())
    }

    @Test
    fun `acepta PNG en limite exacto con nombre y bytes originales`() = runBlocking {
        proveedor.mime = "image/png"
        proveedor.nombre = "../evidencia.png"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, png.inputStream())

        val resultado = importador.importar(uri.toString(), limites.copy(tamanoMaximoFotoBytes = png.size.toLong()))

        assertTrue(resultado.toString(), resultado is Resultado.Exito)
        val evidencia = (resultado as Resultado.Exito).valor
        assertEquals("evidencia.png", evidencia.nombreArchivo)
        assertEquals(TipoEvidencia.FOTOGRAFIA, evidencia.tipo)
        assertEquals("image/png", evidencia.tipoContenido)
        assertArrayEquals(png, evidencia.archivo.readBytes())
    }

    @Test
    fun `rechaza archivo que supera limite durante lectura y elimina copia parcial`() = runBlocking {
        proveedor.mime = "image/png"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, png.inputStream())

        val resultado = importador.importar(uri.toString(), limites.copy(tamanoMaximoFotoBytes = png.size.toLong() - 1))

        assertEquals(Resultado.Fallo(FalloSiniestros.TamanoEvidenciaExcedido), resultado)
        assertTrue(archivos.none { it.exists() })
    }

    @Test
    fun `acepta JPEG y rechaza PNG deshabilitado por el backend`() = runBlocking {
        val jpeg = ByteArrayOutputStream().use { salida ->
            Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).compress(Bitmap.CompressFormat.JPEG, 90, salida)
            salida.toByteArray()
        }
        proveedor.mime = "image/jpeg"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, jpeg.inputStream())
        val resultado = importador.importar(uri.toString(), limites.copy(tamanoMaximoFotoBytes = jpeg.size.toLong()))
        assertTrue(resultado is Resultado.Exito)
        assertEquals("image/jpeg", (resultado as Resultado.Exito).valor.tipoContenido)

        proveedor.mime = "image/png"
        assertEquals(
            Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida),
            importador.importar(uri.toString(), limites.copy(formatosFoto = listOf("image/jpeg"))),
        )
    }

    @Test
    fun `video requiere duracion real y aplica limite inclusivo en milisegundos`() = runBlocking {
        proveedor.mime = "video/mp4"
        duracionVideo = "60000"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, byteArrayOf(1, 2).inputStream())
        val valido = importador.importar(uri.toString(), limites)
        assertTrue(valido is Resultado.Exito)
        assertEquals(60, (valido as Resultado.Exito).valor.duracionSegundos)

        duracionVideo = "59001"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, byteArrayOf(1, 2).inputStream())
        val fraccion = importador.importar(uri.toString(), limites)
        assertTrue(fraccion is Resultado.Exito)
        assertEquals(60, (fraccion as Resultado.Exito).valor.duracionSegundos)

        duracionVideo = "60001"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, byteArrayOf(1, 2).inputStream())
        assertEquals(Resultado.Fallo(FalloSiniestros.DuracionVideoExcedida), importador.importar(uri.toString(), limites))

        duracionVideo = null
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, byteArrayOf(1, 2).inputStream())
        assertEquals(Resultado.Fallo(FalloSiniestros.DuracionVideoNoDisponible), importador.importar(uri.toString(), limites))
        assertEquals(2, archivos.count { it.exists() })
    }

    @Test
    fun `rechaza tipo falseado y errores de lectura sin conservar temporales`() = runBlocking {
        proveedor.mime = "image/png"
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, "no es imagen".byteInputStream())
        assertEquals(Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida), importador.importar(uri.toString(), limites))
        Shadows.shadowOf(contexto.contentResolver).registerInputStream(uri, object : InputStream() {
            override fun read(): Int = throw IOException("fallo de prueba")
        })
        assertEquals(Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible), importador.importar(uri.toString(), limites))
        assertTrue(archivos.none { it.exists() })
    }

    private class ProveedorPrueba : ContentProvider() {
        var mime = "image/png"
        var nombre = "archivo.png"
        override fun onCreate() = true
        override fun getType(uri: Uri): String = mime
        override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor =
            MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME)).apply { addRow(arrayOf(nombre)) }
        override fun insert(uri: Uri, values: ContentValues?): Uri? = null
        override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
        override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
    }
}
