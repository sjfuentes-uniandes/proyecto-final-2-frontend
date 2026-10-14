plugins {
    id("solventa.android.library")
}

android {
    namespace = "com.solventa.core.auth"
}

dependencies {
    // `ProveedorAccessToken` (implementado por GestorSesion) es público: lo necesitan los
    // consumidores de core:auth para conectar la sesión con core:network.
    api(project(":core:network"))

    implementation(libs.aws.cognitoidentityprovider)
    implementation(libs.kotlinx.coroutines.android)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
}
