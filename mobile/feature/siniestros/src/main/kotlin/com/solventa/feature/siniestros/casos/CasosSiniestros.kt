package com.solventa.feature.siniestros.casos

import com.solventa.feature.siniestros.dominio.Borrador
import com.solventa.feature.siniestros.dominio.Evidencia
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import java.util.UUID

class CrearBorradorSiniestro(
    private val repositorio: RepositorioSiniestros,
    private val nuevaClave: () -> String = { UUID.randomUUID().toString() },
) {
    suspend operator fun invoke(
        polizaId: String,
        descripcion: String,
        claveIdempotencia: String? = null,
    ): Resultado<Borrador> {
        val texto = descripcion.trim()
        if (texto.isEmpty()) return Resultado.Fallo(FalloSiniestros.DescripcionObligatoria)
        if (texto.length > MAX_CARACTERES_DESCRIPCION) {
            return Resultado.Fallo(FalloSiniestros.DescripcionDemasiadoLarga)
        }
        return repositorio.crearBorrador(polizaId, texto, claveIdempotencia ?: nuevaClave())
    }

    private companion object {
        const val MAX_CARACTERES_DESCRIPCION = 2000
    }
}

class AgregarEvidenciaAlBorrador(private val repositorio: RepositorioSiniestros) {
    suspend operator fun invoke(
        borradorId: String,
        evidencia: EvidenciaTemporal,
        limites: LimitesSiniestros,
    ): Resultado<Evidencia> = repositorio.agregarEvidencia(borradorId, evidencia, limites)
}
