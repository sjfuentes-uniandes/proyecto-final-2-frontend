package com.solventa.feature.siniestros.datos

import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.LimitesSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import java.io.FileInputStream
import java.io.IOException
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException

internal class CalcularMetadataEvidencia {
    operator fun invoke(
        temporal: EvidenciaTemporal,
        limites: LimitesSiniestros,
    ): Resultado<MetadataEvidencia> {
        if (!temporal.archivo.isFile || temporal.archivo.length() <= 0L) {
            return Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
        }
        if (temporal.tipo == TipoEvidencia.DESCONOCIDO) {
            return Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
        }
        val (maximo, formatos, prefijo) = when (temporal.tipo) {
            TipoEvidencia.FOTOGRAFIA -> Triple(limites.tamanoMaximoFotoBytes, limites.formatosFoto, "image/")
            TipoEvidencia.VIDEO -> Triple(limites.tamanoMaximoVideoBytes, limites.formatosVideo, "video/")
            TipoEvidencia.DESCONOCIDO -> return Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
        }
        val mime = temporal.tipoContenido
        val tamano = temporal.archivo.length()
        if (!mime.startsWith(prefijo) || mime !in formatos) return Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
        if (tamano > maximo) return Resultado.Fallo(FalloSiniestros.TamanoEvidenciaExcedido)
        if (temporal.tipo == TipoEvidencia.VIDEO) {
            val duracion = temporal.duracionSegundos
                ?: return Resultado.Fallo(FalloSiniestros.EvidenciaNoAdmitida)
            if (duracion !in 1..limites.duracionMaximaVideoSegundos) {
                return Resultado.Fallo(FalloSiniestros.DuracionVideoExcedida)
            }
        }
        val digest = try {
            FileInputStream(temporal.archivo).use { entrada ->
                val sha = MessageDigest.getInstance(SHA_256)
                val buffer = ByteArray(BUFFER_SIZE)
                while (true) {
                    val leidos = entrada.read(buffer)
                    if (leidos < 0) break
                    sha.update(buffer, 0, leidos)
                }
                sha.digest().joinToString("") { byte -> (byte.toInt() and 0xff).toString(16).padStart(2, '0') }
            }
        } catch (e: IOException) {
            return Resultado.Fallo(FalloSiniestros.ArchivoNoDisponible)
        } catch (e: NoSuchAlgorithmException) {
            return Resultado.Fallo(FalloSiniestros.RespuestaInvalida)
        }
        return Resultado.Exito(
            MetadataEvidencia(
                nombreArchivo = temporal.nombreArchivo ?: temporal.archivo.name,
                tipo = temporal.tipo,
                tipoContenido = mime,
                tamanoBytes = tamano,
                sha256 = digest,
                capturadaEn = temporal.capturadaEn,
                duracionSegundos = temporal.duracionSegundos,
            ),
        )
    }

    private companion object {
        const val SHA_256 = "SHA-256"
        const val BUFFER_SIZE = 8192
    }
}

internal data class MetadataEvidencia(
    val nombreArchivo: String,
    val tipo: TipoEvidencia,
    val tipoContenido: String,
    val tamanoBytes: Long,
    val sha256: String,
    val capturadaEn: String?,
    val duracionSegundos: Int?,
)
