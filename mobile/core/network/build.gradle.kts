plugins {
    id("solventa.android.library")
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.solventa.core.network"

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(libs.kotlinx.coroutines.android)
    // `BffMovilCliente(api, json = Json {...})` expone `Json` en su constructor: debe ser `api`
    // para que los módulos consumidores (p. ej. `app`) puedan llamarlo sin verlo directamente.
    api(libs.kotlinx.serialization.json)
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.kotlinx.serialization.converter)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging.interceptor)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
}
