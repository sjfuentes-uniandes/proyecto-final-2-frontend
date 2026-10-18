// Build raíz: solo trae los plugins a la classpath (apply false) para que los módulos los apliquen
// por id/alias sin fijar versión cada vez. La configuración común vive en build-logic/convention.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.kover) apply false
}
