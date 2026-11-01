package com.solventa.feature.notificaciones

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Guarda el `dispositivoId` cifrado con AES-GCM (llave en Android Keystore) en preferencias
 * propias, para que `AlmacenSesionSegura.limpiar()` no lo borre antes de la baja.
 */
class AlmacenDispositivoCifrado(
    context: Context,
    private val llave: () -> SecretKey = ::obtenerOCrearLlaveKeystore,
) : AlmacenDispositivo {
    private val preferencias =
        context.applicationContext.getSharedPreferences(ARCHIVO_PREFERENCIAS, Context.MODE_PRIVATE)

    override fun guardar(dispositivoId: String) {
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply { init(Cipher.ENCRYPT_MODE, llave()) }
        val cifrado = cifrador.doFinal(dispositivoId.toByteArray(Charsets.UTF_8))
        preferencias.edit()
            .putString(CLAVE_IV, Base64.encodeToString(cifrador.iv, Base64.NO_WRAP))
            .putString(CLAVE_ID, Base64.encodeToString(cifrado, Base64.NO_WRAP))
            .apply()
    }

    override fun leer(): String? {
        val iv = preferencias.getString(CLAVE_IV, null) ?: return null
        val cifrado = preferencias.getString(CLAVE_ID, null) ?: return null
        return try {
            val cifrador = Cipher.getInstance(TRANSFORMACION).apply {
                init(Cipher.DECRYPT_MODE, llave(), GCMParameterSpec(TAMANO_TAG_BITS, Base64.decode(iv, Base64.NO_WRAP)))
            }
            String(cifrador.doFinal(Base64.decode(cifrado, Base64.NO_WRAP)), Charsets.UTF_8)
        } catch (e: GeneralSecurityException) {
            // Llave invalidada o dato corrupto: se descarta y se registra de nuevo.
            borrar()
            null
        }
    }

    override fun borrar() {
        preferencias.edit().remove(CLAVE_IV).remove(CLAVE_ID).apply()
    }

    private companion object {
        const val ARCHIVO_PREFERENCIAS = "solventa_dispositivo_push"
        const val CLAVE_ID = "dispositivo_id"
        const val CLAVE_IV = "dispositivo_id_iv"
        const val TRANSFORMACION = "AES/GCM/NoPadding"
        const val TAMANO_TAG_BITS = 128
    }
}

private const val PROVEEDOR_KEYSTORE = "AndroidKeyStore"
private const val ALIAS_LLAVE = "solventa_dispositivo_push_llave"

internal fun obtenerOCrearLlaveKeystore(): SecretKey {
    val keyStore = KeyStore.getInstance(PROVEEDOR_KEYSTORE).apply { load(null) }
    (keyStore.getKey(ALIAS_LLAVE, null) as? SecretKey)?.let { return it }
    val generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, PROVEEDOR_KEYSTORE)
    generador.init(
        KeyGenParameterSpec.Builder(ALIAS_LLAVE, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build(),
    )
    return generador.generateKey()
}
