package com.solventa.feature.siniestros.datos

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import android.util.Log
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.AlmacenPendientes
import com.solventa.feature.siniestros.dominio.EstadoUbicacion
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.PendienteLocal
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.ResumenPendienteLocal
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import com.solventa.feature.siniestros.dominio.UbicacionReporte
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.FilterOutputStream
import java.io.DataInputStream
import java.io.IOException
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.json.JSONException
import org.json.JSONObject

class AlmacenPendientesCifrado(
    contexto: Context,
    private val evidencias: AlmacenEvidencias,
    private val tokenSesion: () -> String?,
    private val llave: () -> SecretKey = ::llavePendientes,
) : AlmacenPendientes {
    private val directorio = File(contexto.applicationContext.noBackupFilesDir, "siniestros-pendientes")
    private val mutex = Mutex()
    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun guardar(pendiente: PendienteLocal): Resultado<Unit> = ejecutar {
        val titular = titular() ?: return@ejecutar fallo()
        val carpeta = carpeta(pendiente.id)
        if (!carpeta.isDirectory && !carpeta.mkdirs()) throw IOException("No se pudo crear el directorio")
        val anteriores = registro(carpeta).takeIf {
            it.baseFile.exists() || File("${it.baseFile.path}.bak").exists()
        }?.let(::leer)
        if (anteriores != null && (anteriores.titular != titular || anteriores.finalizado)) return@ejecutar fallo()
        val nuevos = mutableListOf<File>()
        var confirmado = false
        try {
            val archivos = pendiente.evidencias.map { temporal ->
                val destino = File(carpeta, "${UUID.randomUUID()}.enc")
                nuevos.add(destino)
                cifrarArchivo(temporal.archivo, destino)
                EvidenciaDto(
                    temporal.id, destino.name, temporal.tipo.name, temporal.tipoContenido,
                    temporal.nombreArchivo ?: temporal.archivo.name, temporal.capturadaEn, temporal.duracionSegundos,
                    temporal.evidenciaIdServidor,
                )
            }
            val dato = PendienteDto(
                titular, pendiente.id, pendiente.polizaId, pendiente.descripcion, pendiente.causa,
                pendiente.fechaEvento, pendiente.borradorId, pendiente.claveCreacion, archivos,
                pendiente.ubicacion?.let { UbicacionDto.de(it.lectura, it.estado.name) },
                pendiente.ubicacionPendiente?.let { UbicacionDto.de(it, null) },
            )
            escribir(registro(carpeta), dato)
            confirmado = true
            try {
                limpiarArchivos(carpeta, archivos.map { it.archivo }.toSet())
            } catch (_: IOException) {
                Log.w(TAG, "No se pudieron limpiar versiones cifradas anteriores")
            }
            Resultado.Exito(Unit)
        } finally {
            if (!confirmado) nuevos.forEach { if (it.exists() && !it.delete()) Log.w(TAG, "No se pudo limpiar un archivo temporal cifrado") }
        }
    }

    override suspend fun listar(): Resultado<List<ResumenPendienteLocal>> = ejecutar {
        val titular = titular() ?: return@ejecutar fallo()
        if (!directorio.exists()) return@ejecutar Resultado.Exito(emptyList())
        val carpetas = directorio.listFiles() ?: throw IOException("No se pudo listar el almacenamiento")
        val pendientes = carpetas.filter { it.isDirectory && esUuid(it.name) }.mapNotNull { carpeta ->
            val archivo = registro(carpeta)
            if (!archivo.baseFile.exists() && !File("${archivo.baseFile.path}.bak").exists()) return@mapNotNull null
            val dato = leer(archivo)
            if (dato.titular != titular || dato.finalizado) null else ResumenPendienteLocal(
                dato.id, dato.descripcion, dato.evidencias.size, dato.borradorId,
            )
        }
        Resultado.Exito(pendientes)
    }

    override suspend fun abrir(id: String): Resultado<PendienteLocal> {
        val temporales = mutableListOf<File>()
        var entregado = false
        try {
            val resultado = ejecutar {
                val titular = titular() ?: return@ejecutar fallo()
                val carpeta = carpeta(id)
                val dato = leer(registro(carpeta))
                if (dato.titular != titular || dato.id != id || dato.finalizado) return@ejecutar fallo()
                val restauradas = dato.evidencias.map { evidencia ->
                    if (!esNombreCifrado(evidencia.archivo)) throw IOException("Nombre de evidencia inválido")
                    val tipo = TipoEvidencia.valueOf(evidencia.tipo)
                    val extension = when (evidencia.mime) {
                        "image/jpeg" -> "jpg"
                        "image/png" -> "png"
                        "video/mp4" -> "mp4"
                        else -> throw IOException("Formato no disponible")
                    }
                    val temporal = evidencias.crearArchivo(extension)
                    temporales.add(temporal)
                    descifrarArchivo(File(carpeta, evidencia.archivo), temporal)
                    EvidenciaTemporal(
                        evidencia.id, temporal, tipo, evidencia.capturadaEn, evidencia.duracion,
                        evidencia.evidenciaIdServidor, evidencia.mime, evidencia.nombre,
                    )
                }
                Resultado.Exito(
                    PendienteLocal(
                        dato.id, dato.polizaId, dato.descripcion, dato.causa, dato.fechaEvento,
                        dato.borradorId, dato.claveCreacion, restauradas,
                        dato.ubicacion?.let { UbicacionReporte(it.lectura(), EstadoUbicacion.valueOf(requireNotNull(it.estado))) },
                        dato.ubicacionPendiente?.lectura(),
                    ),
                )
            }
            entregado = resultado is Resultado.Exito
            return resultado
        } finally {
            if (!entregado) temporales.forEach(evidencias::eliminar)
        }
    }

    override suspend fun eliminar(id: String): Resultado<Unit> = ejecutar {
        val titular = titular() ?: return@ejecutar fallo()
        val carpeta = carpeta(id)
        val archivo = registro(carpeta)
        val dato = leer(archivo)
        if (dato.titular != titular || dato.id != id) return@ejecutar fallo()
        escribir(archivo, dato.copy(finalizado = true))
        limpiarArchivos(carpeta, emptySet())
        archivo.delete()
        if (archivo.baseFile.exists() || !carpeta.delete()) throw IOException("No se pudo eliminar el pendiente")
        Resultado.Exito(Unit)
    }

    private suspend fun <T> ejecutar(bloque: suspend () -> Resultado<T>): Resultado<T> =
        withContext(Dispatchers.IO) {
            mutex.withLock {
                try {
                    bloque()
                } catch (_: IOException) {
                    fallo()
                } catch (_: GeneralSecurityException) {
                    fallo()
                } catch (_: SerializationException) {
                    fallo()
                } catch (_: IllegalArgumentException) {
                    fallo()
                } catch (_: SecurityException) {
                    fallo()
                }
            }
        }

    private fun titular(): String? {
        val token = tokenSesion() ?: return null
        return try {
            val partes = token.split('.')
            if (partes.size != 3) return null
            val datos = JSONObject(String(Base64.decode(partes[1], Base64.URL_SAFE or Base64.NO_WRAP), Charsets.UTF_8))
            val emisor = datos.getString("iss").takeIf { it.isNotBlank() } ?: return null
            val sujeto = datos.getString("sub").takeIf { it.isNotBlank() } ?: return null
            "$emisor|$sujeto"
        } catch (_: JSONException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    private fun carpeta(id: String): File {
        require(esUuid(id))
        return File(directorio, id)
    }

    private fun registro(carpeta: File) = AtomicFile(File(carpeta, "registro"))

    private fun leer(archivo: AtomicFile): PendienteDto {
        val bytes = archivo.openRead().use { it.readBytes() }
        if (bytes.size <= IV_BYTES) throw IOException("Registro incompleto")
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply {
            init(Cipher.DECRYPT_MODE, llave(), GCMParameterSpec(TAG_BITS, bytes.copyOfRange(0, IV_BYTES)))
        }
        return json.decodeFromString(String(cifrador.doFinal(bytes.copyOfRange(IV_BYTES, bytes.size)), Charsets.UTF_8))
    }

    private fun escribir(archivo: AtomicFile, dato: PendienteDto) {
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply { init(Cipher.ENCRYPT_MODE, llave()) }
        val cifrado = cifrador.doFinal(json.encodeToString(dato).toByteArray(Charsets.UTF_8))
        val salida = archivo.startWrite()
        try {
            salida.write(cifrador.iv)
            salida.write(cifrado)
            archivo.finishWrite(salida)
        } catch (e: IOException) {
            archivo.failWrite(salida)
            throw e
        }
    }

    private suspend fun cifrarArchivo(origen: File, destino: File) {
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply { init(Cipher.ENCRYPT_MODE, llave()) }
        FileInputStream(origen).use { entrada ->
            FileOutputStream(destino).use { salida ->
                salida.write(cifrador.iv)
                val sinCerrar = object : FilterOutputStream(salida) {
                    override fun write(bytes: ByteArray, offset: Int, longitud: Int) { out.write(bytes, offset, longitud) }
                    override fun close() { flush() }
                }
                CipherOutputStream(sinCerrar, cifrador).use { copia(entrada, it) }
                salida.fd.sync()
            }
        }
    }

    private suspend fun descifrarArchivo(origen: File, destino: File) {
        FileInputStream(origen).use { entrada ->
            val iv = ByteArray(IV_BYTES)
            DataInputStream(entrada).readFully(iv)
            val cifrador = Cipher.getInstance(TRANSFORMACION).apply {
                init(Cipher.DECRYPT_MODE, llave(), GCMParameterSpec(TAG_BITS, iv))
            }
            CipherInputStream(entrada, cifrador).use { cifrado ->
                destino.outputStream().use { salida -> copia(cifrado, salida) }
            }
        }
    }

    private suspend fun copia(entrada: java.io.InputStream, salida: java.io.OutputStream) {
        val buffer = ByteArray(8192)
        while (true) {
            currentCoroutineContext().ensureActive()
            val leidos = entrada.read(buffer)
            if (leidos < 0) break
            salida.write(buffer, 0, leidos)
        }
    }

    private fun limpiarArchivos(carpeta: File, conservar: Set<String>) {
        val archivos = carpeta.listFiles() ?: throw IOException("No se pudo listar el pendiente")
        archivos.filter { esNombreCifrado(it.name) && it.name !in conservar }.forEach {
            if (!it.delete()) throw IOException("No se pudo eliminar evidencia cifrada")
        }
    }

    private fun esUuid(valor: String): Boolean = try { UUID.fromString(valor).toString() == valor } catch (_: IllegalArgumentException) { false }
    private fun esNombreCifrado(valor: String) = valor.endsWith(".enc") && esUuid(valor.removeSuffix(".enc"))
    private fun <T> fallo(): Resultado<T> = Resultado.Fallo(FalloSiniestros.PendienteLocalNoDisponible)

    private companion object {
        const val TAG = "PendientesSiniestros"
        const val TRANSFORMACION = "AES/GCM/NoPadding"
        const val IV_BYTES = 12
        const val TAG_BITS = 128
    }
}

@Serializable
private data class PendienteDto(
    val titular: String,
    val id: String,
    val polizaId: String,
    val descripcion: String,
    val causa: String?,
    val fechaEvento: String,
    val borradorId: String?,
    val claveCreacion: String,
    val evidencias: List<EvidenciaDto>,
    val ubicacion: UbicacionDto?,
    val ubicacionPendiente: UbicacionDto?,
    val finalizado: Boolean = false,
)

@Serializable
private data class EvidenciaDto(
    val id: String,
    val archivo: String,
    val tipo: String,
    val mime: String,
    val nombre: String?,
    val capturadaEn: String?,
    val duracion: Int?,
    val evidenciaIdServidor: String?,
)

@Serializable
private data class UbicacionDto(
    val permiso: String,
    val lat: Double?,
    val lon: Double?,
    val precision: Double?,
    val capturadaEn: String?,
    val estado: String?,
) {
    fun lectura() = UbicacionCapturada(PermisoUbicacion.valueOf(permiso), lat, lon, precision, capturadaEn)
    companion object {
        fun de(lectura: UbicacionCapturada, estado: String?) = UbicacionDto(
            lectura.permiso.name, lectura.lat, lectura.lon, lectura.precisionM, lectura.capturadaEn, estado,
        )
    }
}

private fun llavePendientes(): SecretKey {
    val almacen = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (almacen.getKey("solventa_pendientes_siniestros", null) as? SecretKey)?.let { return it }
    val generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generador.init(
        KeyGenParameterSpec.Builder(
            "solventa_pendientes_siniestros",
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build(),
    )
    return generador.generateKey()
}
