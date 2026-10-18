package com.solventa.feature.onboardingidentidad.captura

import org.junit.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SelfieEnMemoriaTest {
    @Test
    fun `aBase64 codifica los bytes de la selfie`() {
        val selfie = SelfieEnMemoria(byteArrayOf(1, 2, 3, 4))

        assertEquals("AQIDBA==", selfie.aBase64())
    }

    @Test
    fun `limpiar sobrescribe con ceros el arreglo original y suelta la referencia (AC4)`() {
        val bytes = byteArrayOf(9, 8, 7, 6)
        val selfie = SelfieEnMemoria(bytes)

        selfie.limpiar()

        assertContentEquals(byteArrayOf(0, 0, 0, 0), bytes)
        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `no se puede usar una selfie ya limpiada`() {
        val selfie = SelfieEnMemoria(byteArrayOf(1))
        selfie.limpiar()

        assertFailsWith<IllegalStateException> { selfie.aBase64() }
    }

    @Test
    fun `limpiar dos veces es inofensivo`() {
        val selfie = SelfieEnMemoria(byteArrayOf(1))

        selfie.limpiar()
        selfie.limpiar()

        assertTrue(selfie.estaLimpia)
    }

    @Test
    fun `toString no revela el contenido`() {
        val selfie = SelfieEnMemoria(byteArrayOf(1, 2, 3))

        assertFalse(selfie.toString().contains("1, 2, 3"))
        assertEquals("SelfieEnMemoria(<redactada>)", selfie.toString())
    }
}

class AjustadorTamanoTest {
    @Test
    fun `longitudBase64 coincide con el tamano real del base64`() {
        listOf(0, 1, 2, 3, 4, 100, 1_000).forEach { n ->
            assertEquals(java.util.Base64.getEncoder().encodeToString(ByteArray(n)).length, AjustadorTamano.longitudBase64(n))
        }
    }

    @Test
    fun `si cabe a la maxima calidad y escala no degrada`() {
        val intentos = mutableListOf<Pair<Int, Float>>()

        val resultado = AjustadorTamano.ajustar(maxCaracteres = 1_000) { calidad, escala ->
            intentos += calidad to escala
            ByteArray(100)
        }

        assertNotNull(resultado)
        assertEquals(listOf(90 to 1f), intentos)
    }

    @Test
    fun `baja primero la calidad y luego la escala hasta que cabe`() {
        val resultado = AjustadorTamano.ajustar(maxCaracteres = 400) { calidad, escala ->
            // 300 bytes -> 400 caracteres: solo cabe desde escala 0.5 con calidad 60 o menos.
            if (escala <= 0.5f && calidad <= 60) ByteArray(300) else ByteArray(5_000)
        }

        assertNotNull(resultado)
        assertEquals(300, resultado.size)
    }

    @Test
    fun `devuelve null si ni la menor escala y calidad caben`() {
        assertNull(AjustadorTamano.ajustar(maxCaracteres = 10) { _, _ -> ByteArray(10_000) })
    }

    @Test
    fun `los intentos descartados quedan sobrescritos con ceros`() {
        val descartados = mutableListOf<ByteArray>()

        AjustadorTamano.ajustar(maxCaracteres = 100) { calidad, escala ->
            ByteArray(if (calidad == 50 && escala == 0.35f) 10 else 1_000) { 7 }.also { descartados += it }
        }

        descartados.dropLast(1).forEach { assertTrue(it.all { byte -> byte == 0.toByte() }) }
    }
}
