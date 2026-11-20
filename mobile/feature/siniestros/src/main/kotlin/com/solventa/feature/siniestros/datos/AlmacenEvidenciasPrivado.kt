package com.solventa.feature.siniestros.datos

import android.content.Context
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import java.io.File

class AlmacenEvidenciasPrivado(contexto: Context) : AlmacenEvidencias {
    private val directorio = File(contexto.cacheDir, DIRECTORIO).apply {
        if (!exists() && !mkdirs()) error("No fue posible crear el almacenamiento temporal privado")
    }

    override fun crearArchivo(extension: String): File {
        require(extension == "jpg" || extension == "png" || extension == "mp4")
        return File.createTempFile("captura-", ".$extension", directorio)
    }

    override fun eliminar(archivo: File) {
        require(archivo.canonicalFile.parentFile == directorio.canonicalFile)
        if (archivo.exists() && !archivo.delete()) error("No fue posible eliminar la evidencia temporal")
    }

    private companion object {
        const val DIRECTORIO = "siniestros-evidencias"
    }
}
