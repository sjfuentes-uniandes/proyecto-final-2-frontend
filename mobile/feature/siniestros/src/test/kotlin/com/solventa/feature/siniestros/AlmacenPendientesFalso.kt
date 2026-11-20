package com.solventa.feature.siniestros

import com.solventa.feature.siniestros.dominio.AlmacenPendientes
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.PendienteLocal
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.ResumenPendienteLocal

class AlmacenPendientesFalso : AlmacenPendientes {
    val guardados = mutableMapOf<String, PendienteLocal>()
    var falloGuardado: FalloSiniestros? = null

    override suspend fun guardar(pendiente: PendienteLocal): Resultado<Unit> {
        falloGuardado?.let { return Resultado.Fallo(it) }
        guardados[pendiente.id] = pendiente
        return Resultado.Exito(Unit)
    }

    override suspend fun listar(): Resultado<List<ResumenPendienteLocal>> =
        Resultado.Exito(guardados.values.map {
            ResumenPendienteLocal(it.id, it.descripcion, it.evidencias.size, it.borradorId)
        })

    override suspend fun abrir(id: String): Resultado<PendienteLocal> =
        guardados[id]?.let { Resultado.Exito(it) } ?: Resultado.Fallo(FalloSiniestros.PendienteLocalNoDisponible)

    override suspend fun eliminar(id: String): Resultado<Unit> {
        guardados.remove(id)
        return Resultado.Exito(Unit)
    }
}
