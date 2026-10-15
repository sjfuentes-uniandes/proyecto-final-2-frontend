plugins {
    id("solventa.android.library")
}

android {
    namespace = "com.solventa.core.security"
}

dependencies {
    // `AlmacenSesionSegura` (implementado por AlmacenSesionSeguraKeystore) viene de core:auth.
    api(project(":core:auth"))
    // `GestorBiometria.autenticar` expone `FragmentActivity`/`BiometricPrompt` en su firma
    // pública: debe ser `api` para que los módulos que lo consuman vean esos tipos.
    api(libs.androidx.biometric)
    implementation(libs.androidx.core.ktx)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.mockk)
}
