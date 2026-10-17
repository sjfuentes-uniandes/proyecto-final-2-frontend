package com.solventa.app

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Fija la configuración de seguridad que protege la evidencia biométrica (HU-M06): sin copias de
 * seguridad ni transferencia a otro dispositivo, y HTTPS obligatorio salvo en builds debug.
 */
class ConfiguracionSeguridadTest {
    private val manifiesto = File("src/main/AndroidManifest.xml").readText()
    private val manifiestoDebug = File("src/debug/AndroidManifest.xml").readText()

    @Test
    fun `la app no permite copias de seguridad`() {
        assertTrue(manifiesto.contains("""android:allowBackup="false""""))
    }

    @Test
    fun `el trafico sin cifrar esta prohibido en el manifiesto principal`() {
        assertTrue(manifiesto.contains("""android:usesCleartextTraffic="false""""))
        assertFalse("la excepcion de HTTP solo debe vivir en debug", manifiesto.contains("networkSecurityConfig"))
    }

    @Test
    fun `solo el build debug permite HTTP, y solo hacia el backend local`() {
        assertTrue(manifiestoDebug.contains("networkSecurityConfig"))
        val configuracion = File("src/debug/res/xml/network_security_config.xml").readText()
        val dominios = Regex("""<domain[^>]*>([^<]+)</domain>""").findAll(configuracion).map { it.groupValues[1] }.toSet()

        assertEquals(setOf("10.0.2.2", "localhost"), dominios)
    }

    @Test
    fun `las reglas de extraccion excluyen todo del respaldo y de la transferencia`() {
        assertTrue(manifiesto.contains("""android:dataExtractionRules="@xml/data_extraction_rules""""))
        val reglas = File("src/main/res/xml/data_extraction_rules.xml").readText()
        val dominios = listOf("root", "file", "database", "sharedpref", "external")

        for (seccion in listOf("cloud-backup", "device-transfer")) {
            val contenido = reglas.substringAfter("<$seccion>").substringBefore("</$seccion>")
            dominios.forEach { dominio ->
                assertTrue("$seccion debe excluir $dominio", contenido.contains("""<exclude domain="$dominio" />"""))
            }
            assertFalse("$seccion no debe incluir nada", contenido.contains("<include"))
        }
    }
}
