package com.solventa.core.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.solventa.core.auth.AlmacenSesionSegura
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Implementa `AlmacenSesionSegura` (core:auth) cifrando el usuario activo con una llave AES-GCM
 * que nunca sale de Android Keystore. Protege el dato en reposo; el gesto biométrico en sí lo
 * resuelve [GestorBiometria] en la UI, antes de llamar a `GestorSesion.restaurarSesion()`.
 */
class AlmacenSesionSeguraKeystore(context: Context) : AlmacenSesionSegura {
    private val preferencias = context.applicationContext.getSharedPreferences(ARCHIVO_PREFERENCIAS, Context.MODE_PRIVATE)

    override fun guardarUsuarioActivo(usuario: String) {
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply { init(Cipher.ENCRYPT_MODE, obtenerOCrearLlave()) }
        val usuarioCifrado = cifrador.doFinal(usuario.toByteArray(Charsets.UTF_8))
        preferencias.edit()
            .putString(CLAVE_IV, Base64.encodeToString(cifrador.iv, Base64.NO_WRAP))
            .putString(CLAVE_USUARIO, Base64.encodeToString(usuarioCifrado, Base64.NO_WRAP))
            .apply()
    }

    override fun usuarioActivo(): String? {
        val ivCodificado = preferencias.getString(CLAVE_IV, null) ?: return null
        val usuarioCifrado = preferencias.getString(CLAVE_USUARIO, null) ?: return null
        return try {
            val cifrador = Cipher.getInstance(TRANSFORMACION).apply {
                val iv = Base64.decode(ivCodificado, Base64.NO_WRAP)
                init(Cipher.DECRYPT_MODE, obtenerOCrearLlave(), GCMParameterSpec(TAMANO_TAG_BITS, iv))
            }
            String(cifrador.doFinal(Base64.decode(usuarioCifrado, Base64.NO_WRAP)), Charsets.UTF_8)
        } catch (e: GeneralSecurityException) {
            // La llave de Keystore ya no sirve (p. ej. se restauró un backup en otro dispositivo
            // o el almacén de claves se invalidó): se limpia para no quedar en un estado a medias.
            limpiar()
            null
        }
    }

    override fun limpiar() {
        preferencias.edit().clear().apply()
    }

    private fun obtenerOCrearLlave(): SecretKey {
        val almacenLlaves = KeyStore.getInstance(PROVEEDOR_KEYSTORE).apply { load(null) }
        (almacenLlaves.getKey(ALIAS_LLAVE, null) as? SecretKey)?.let { return it }

        val generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, PROVEEDOR_KEYSTORE)
        generador.init(
            KeyGenParameterSpec.Builder(ALIAS_LLAVE, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return generador.generateKey()
    }

    private companion object {
        const val ARCHIVO_PREFERENCIAS = "solventa_sesion_segura"
        const val CLAVE_USUARIO = "usuario_activo"
        const val CLAVE_IV = "usuario_activo_iv"
        const val ALIAS_LLAVE = "solventa_sesion_segura_llave"
        const val PROVEEDOR_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMACION = "AES/GCM/NoPadding"
        const val TAMANO_TAG_BITS = 128
    }
}
