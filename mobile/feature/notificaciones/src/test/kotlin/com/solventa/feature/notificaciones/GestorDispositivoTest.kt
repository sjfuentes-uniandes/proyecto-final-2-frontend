package com.solventa.feature.notificaciones

import com.solventa.core.network.ResultadoBajaDispositivo
import com.solventa.core.network.ResultadoDispositivo
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class RedFalsa : RedDispositivos {
    val registros = mutableListOf<String>()
    val bajas = mutableListOf<Pair<String, String>>()
    var resultadoRegistro: (String) -> ResultadoDispositivo = { ResultadoDispositivo.Exito("id-$it") }
    var resultadoBaja: ResultadoBajaDispositivo = ResultadoBajaDispositivo.Exito
    var lanzar = false
    var retardoMs = 0L
    var enCurso = 0
    var maxConcurrentes = 0
    var alBaja: () -> Unit = {}

    private suspend fun <T> medir(bloque: () -> T): T {
        enCurso++
        maxConcurrentes = maxOf(maxConcurrentes, enCurso)
        try {
            delay(retardoMs)
            if (lanzar) throw IllegalStateException("red caída")
            return bloque()
        } finally {
            enCurso--
        }
    }

    override suspend fun registrar(tokenPush: String): ResultadoDispositivo = medir {
        registros += tokenPush
        resultadoRegistro(tokenPush)
    }

    override suspend fun darDeBaja(dispositivoId: String, autorizacion: String?): ResultadoBajaDispositivo = medir {
        alBaja()
        bajas += dispositivoId to autorizacion.orEmpty()
        resultadoBaja
    }
}

private class AlmacenFalso(var id: String? = null) : AlmacenDispositivo {
    var guardados = 0
    override fun leer() = id
    override fun guardar(dispositivoId: String) {
        id = dispositivoId
        guardados++
    }
    override fun borrar() {
        id = null
    }
}

class GestorDispositivoTest {
    private val red = RedFalsa()
    private val almacen = AlmacenFalso()
    private var sesion: String? = "sesion-1"
    private var token: String? = "tok-1"

    private fun gestor() = GestorDispositivo(red, { token }, almacen, { sesion })

    @Test
    fun `registra el dispositivo y guarda el dispositivoId`() = runTest {
        val g = gestor()
        g.registrar()
        assertEquals(listOf("tok-1"), red.registros)
        assertEquals("id-tok-1", almacen.id)
        assertFalse(g.registroPendiente)
    }

    @Test
    fun `repetir el registro con el mismo token es idempotente`() = runTest {
        val g = gestor()
        g.registrar()
        g.registrar()
        assertEquals(1, red.registros.size)
        assertEquals("id-tok-1", almacen.id)
    }

    @Test
    fun `token nuevo con dispositivoId previo da de baja el anterior y registra el nuevo`() = runTest {
        val g = gestor()
        g.registrar()
        g.alTokenNuevo("tok-2")
        assertEquals(listOf("id-tok-1" to "Bearer sesion-1"), red.bajas)
        assertEquals(listOf("tok-1", "tok-2"), red.registros)
        assertEquals("id-tok-2", almacen.id)
    }

    @Test
    fun `token nuevo sin dispositivoId previo solo registra`() = runTest {
        val g = gestor()
        g.alTokenNuevo("tok-2")
        assertTrue(red.bajas.isEmpty())
        assertEquals("id-tok-2", almacen.id)
    }

    @Test
    fun `token nuevo repetido o vacio no llama a la red`() = runTest {
        val g = gestor()
        g.alTokenNuevo("tok-2")
        g.alTokenNuevo("tok-2")
        g.alTokenNuevo(" ")
        assertEquals(1, red.registros.size)
    }

    @Test
    fun `sin sesion el registro queda pendiente y se completa al haberla`() = runTest {
        sesion = null
        val g = gestor()
        g.registrar()
        g.alTokenNuevo("tok-2")
        assertTrue(g.registroPendiente)
        assertTrue(red.registros.isEmpty())
        assertNull(almacen.id)

        sesion = "sesion-1"
        g.registrar()
        assertFalse(g.registroPendiente)
        assertEquals("id-tok-1", almacen.id)
    }

    @Test
    fun `sin token push no registra`() = runTest {
        token = null
        val g = gestor()
        g.registrar()
        assertTrue(red.registros.isEmpty())
        assertFalse(g.registroPendiente)
    }

    @Test
    fun `un registro fallido o con excepcion queda pendiente sin lanzar`() = runTest {
        red.resultadoRegistro = { ResultadoDispositivo.ServicioNoDisponible("x") }
        val g = gestor()
        g.registrar()
        assertTrue(g.registroPendiente)
        assertNull(almacen.id)

        red.lanzar = true
        g.registrar()
        assertTrue(g.registroPendiente)
    }

    @Test
    fun `baja con exito envia la autorizacion capturada y borra el dispositivoId`() = runTest {
        val g = gestor()
        g.registrar()
        sesion = null
        g.darDeBaja("sesion-1")
        assertEquals(listOf("id-tok-1" to "Bearer sesion-1"), red.bajas)
        assertNull(almacen.id)
    }

    @Test
    fun `baja fallida se tolera y el dispositivoId se borra igual`() = runTest {
        val g = gestor()
        g.registrar()
        red.resultadoBaja = ResultadoBajaDispositivo.Tolerado
        g.darDeBaja("sesion-1")
        assertNull(almacen.id)

        almacen.id = "id-x"
        red.lanzar = true
        g.darDeBaja("sesion-1")
        assertNull(almacen.id)
    }

    @Test
    fun `baja sin token de sesion borra localmente sin llamar a la red`() = runTest {
        almacen.id = "id-x"
        gestor().darDeBaja(null)
        assertTrue(red.bajas.isEmpty())
        assertNull(almacen.id)
    }

    @Test
    fun `sin dispositivoId la baja no llama a la red`() = runTest {
        gestor().darDeBaja("sesion-1")
        assertTrue(red.bajas.isEmpty())
    }

    @Test
    fun `tras la baja se puede registrar de nuevo`() = runTest {
        val g = gestor()
        g.registrar()
        g.darDeBaja("sesion-1")
        g.registrar()
        assertEquals(2, red.registros.size)
        assertEquals("id-tok-1", almacen.id)
    }

    @Test
    fun `dos registros simultaneos dejan un solo dispositivoId y no se solapan en la red`() = runTest {
        red.retardoMs = 50
        val g = gestor()
        listOf(async { g.registrar() }, async { g.alTokenNuevo("tok-1") }, async { g.registrar() }).awaitAll()
        assertEquals(1, red.maxConcurrentes)
        assertEquals(1, red.registros.size)
        assertEquals(1, almacen.guardados)
        assertEquals("id-tok-1", almacen.id)
    }

    @Test
    fun `una baja concurrente con un registro no queda a medias`() = runTest {
        red.retardoMs = 50
        val g = gestor()
        g.registrar()
        // El almacén conserva el id mientras la baja está en curso; se borra solo al terminar.
        red.alBaja = { assertEquals("id-tok-1", almacen.id) }
        val trabajos = listOf(async { g.darDeBaja("sesion-1") }, async { g.alTokenNuevo("tok-9") })
        trabajos.awaitAll()
        assertEquals(1, red.maxConcurrentes)
        assertEquals(1, red.bajas.size)
        // Orden serializado: baja completa y luego registro completo con un único id guardado.
        assertEquals("id-tok-9", almacen.id)
    }
}
