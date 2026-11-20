package com.solventa.feature.siniestros.datos

import android.app.Application
import android.content.Context
import android.content.ContextWrapper
import android.util.Base64
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.EstadoUbicacion
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.PendienteLocal
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import com.solventa.feature.siniestros.dominio.UbicacionReporte
import java.io.File
import java.util.UUID
import javax.crypto.KeyGenerator
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class)
class AlmacenPendientesCifradoTest {
    @get:Rule val carpeta = TemporaryFolder()
    private val llave = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
    private var usuario = "titular-a"
    private val contexto: Context by lazy {
        object : ContextWrapper(RuntimeEnvironment.getApplication()) {
            override fun getApplicationContext(): Context = this
            override fun getNoBackupFilesDir(): File = carpeta.root
        }
    }
    private val almacenamiento = object : AlmacenEvidencias {
        override fun crearArchivo(extension: String) = File.createTempFile("restaurado-", ".$extension", carpeta.root)
        override fun eliminar(archivo: File) { check(!archivo.exists() || archivo.delete()) }
    }
    private fun token() = "x.${Base64.encodeToString("""{"iss":"pool","sub":"$usuario"}""".toByteArray(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)}.x"
    private fun crear() = AlmacenPendientesCifrado(contexto, almacenamiento, ::token) { llave }

    @Test
    fun `cifra datos y evidencia y restaura solo al mismo titular tras recrear almacen`() = runBlocking {
        val contenido = "evidencia-sintetica".toByteArray()
        val origen = carpeta.newFile("foto.jpg").apply { writeBytes(contenido) }
        val pendiente = pendiente(origen)
        assertEquals(Resultado.Exito(Unit), crear().guardar(pendiente))
        val cifrados = File(carpeta.root, "siniestros-pendientes").walkTopDown().filter { it.isFile }.toList()
        assertEquals(2, cifrados.size)
        cifrados.forEach {
            val bytes = it.readBytes().toString(Charsets.ISO_8859_1)
            assertFalse(bytes.contains("descripcion-sintetica"))
            assertFalse(bytes.contains("evidencia-sintetica"))
        }
        usuario = "titular-b"
        assertEquals(Resultado.Exito(emptyList<Any>()), crear().listar())
        assertEquals(Resultado.Fallo(FalloSiniestros.PendienteLocalNoDisponible), crear().abrir(pendiente.id))
        usuario = "titular-a"
        val restaurado = (crear().abrir(pendiente.id) as Resultado.Exito).valor
        assertEquals(pendiente.descripcion, restaurado.descripcion)
        assertEquals(pendiente.claveCreacion, restaurado.claveCreacion)
        assertEquals(pendiente.ubicacion, restaurado.ubicacion)
        assertEquals("original.jpg", restaurado.evidencias.single().nombreArchivo)
        assertArrayEquals(contenido, restaurado.evidencias.single().archivo.readBytes())
        assertEquals(Resultado.Exito(Unit), crear().eliminar(pendiente.id))
        assertTrue((crear().listar() as Resultado.Exito).valor.isEmpty())
    }

    @Test
    fun `fallo al actualizar no destruye version anterior`() = runBlocking {
        val origen = carpeta.newFile("foto.jpg").apply { writeText("original") }
        val pendiente = pendiente(origen)
        assertEquals(Resultado.Exito(Unit), crear().guardar(pendiente))
        val ausente = File(carpeta.root, "ausente.jpg")
        val modificada = pendiente.copy(descripcion = "otra", evidencias = listOf(pendiente.evidencias.single().copy(archivo = ausente)))
        assertEquals(Resultado.Fallo(FalloSiniestros.PendienteLocalNoDisponible), crear().guardar(modificada))
        val restaurado = (crear().abrir(pendiente.id) as Resultado.Exito).valor
        assertEquals("descripcion-sintetica", restaurado.descripcion)
        assertEquals("original", restaurado.evidencias.single().archivo.readText())
    }

    @Test
    fun `conserva nombre de captura para recuperar carga sin duplicar evidencia`() = runBlocking {
        val origen = carpeta.newFile("captura-original.jpg").apply { writeText("original") }
        val pendiente = pendiente(origen).let {
            it.copy(evidencias = listOf(it.evidencias.single().copy(nombreArchivo = null)))
        }
        assertEquals(Resultado.Exito(Unit), crear().guardar(pendiente))
        val restaurado = (crear().abrir(pendiente.id) as Resultado.Exito).valor
        assertEquals("captura-original.jpg", restaurado.evidencias.single().nombreArchivo)
    }

    @Test
    fun `detecta corrupcion de evidencia y elimina la copia temporal descifrada`() = runBlocking {
        val origen = carpeta.newFile("foto.jpg").apply { writeText("original") }
        val pendiente = pendiente(origen)
        assertEquals(Resultado.Exito(Unit), crear().guardar(pendiente))
        val cifrado = File(carpeta.root, "siniestros-pendientes").walkTopDown().first { it.name.endsWith(".enc") }
        val bytes = cifrado.readBytes()
        bytes[bytes.lastIndex] = (bytes.last().toInt() xor 1).toByte()
        cifrado.writeBytes(bytes)
        assertEquals(Resultado.Fallo(FalloSiniestros.PendienteLocalNoDisponible), crear().abrir(pendiente.id))
        assertTrue(carpeta.root.listFiles()!!.none { it.name.startsWith("restaurado-") })
    }

    private fun pendiente(origen: File) = PendienteLocal(
        id = UUID.randomUUID().toString(), polizaId = "poliza", descripcion = "descripcion-sintetica",
        causa = "DANOS", fechaEvento = "2026-11-18T10:00:00-05:00", borradorId = null,
        claveCreacion = UUID.randomUUID().toString(),
        evidencias = listOf(EvidenciaTemporal("uno", origen, TipoEvidencia.FOTOGRAFIA, null, nombreArchivo = "original.jpg")),
        ubicacion = UbicacionReporte(UbicacionCapturada(PermisoUbicacion.DENEGADO), EstadoUbicacion.NO_DISPONIBLE),
        ubicacionPendiente = null,
    )
}
