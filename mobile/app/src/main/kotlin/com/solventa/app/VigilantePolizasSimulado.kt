package com.solventa.app

import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado
import kotlinx.coroutines.delay

/** Pólizas ya vistas, persistidas para no repetir avisos entre ejecuciones. */
interface PolizasConocidas {
    /** Null si nunca se tomó una primera lectura. */
    fun leer(): Set<String>?

    fun guardar(ids: Set<String>)
}

/**
 * Sustituto de FCM solo para debug: con la sesión abierta consulta las pólizas del cliente y,
 * cuando aparece una nueva (se emitió), publica el aviso. La primera lectura no avisa: solo fija
 * la línea base para no notificar pólizas anteriores.
 */
class VigilantePolizasSimulado(
    private val repositorio: RepositorioPolizas,
    private val conocidas: PolizasConocidas,
    private val avisar: (polizaId: String) -> Unit,
    private val intervaloMs: Long = INTERVALO_MS,
) {
    suspend fun vigilar() {
        while (true) {
            revisar()
            delay(intervaloMs)
        }
    }

    suspend fun revisar() {
        val actuales = (repositorio.listar() as? Resultado.Exito)?.valor?.map { it.polizaId }?.toSet() ?: return
        val previas = conocidas.leer()
        if (previas != null) (actuales - previas).forEach(avisar)
        conocidas.guardar((previas ?: emptySet()) + actuales)
    }

    private companion object {
        const val INTERVALO_MS = 15_000L
    }
}
