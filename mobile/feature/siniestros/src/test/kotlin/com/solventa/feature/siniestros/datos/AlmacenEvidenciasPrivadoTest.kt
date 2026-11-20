package com.solventa.feature.siniestros.datos

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AlmacenEvidenciasPrivadoTest {
    private val contexto = ApplicationProvider.getApplicationContext<Context>()
    private val almacen = AlmacenEvidenciasPrivado(contexto)

    @Test
    fun `crea y elimina temporales bajo cache privado`() {
        val archivo = almacen.crearArchivo("jpg")

        assertTrue(archivo.exists())
        assertEquals(
            File(contexto.cacheDir, "siniestros-evidencias").canonicalFile,
            archivo.parentFile?.canonicalFile,
        )
        almacen.eliminar(archivo)
        assertFalse(archivo.exists())
    }

    @Test
    fun `rechaza extension no permitida y archivos fuera del directorio privado`() {
        assertThrows(IllegalArgumentException::class.java) {
            almacen.crearArchivo("png")
        }
        assertThrows(IllegalArgumentException::class.java) {
            almacen.eliminar(File(contexto.cacheDir, "otro-archivo"))
        }
    }
}
