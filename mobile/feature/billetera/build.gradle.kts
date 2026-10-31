import kotlinx.kover.gradle.plugin.dsl.CoverageUnit

plugins {
    id("solventa.android.library")
    id("solventa.android.compose")
    alias(libs.plugins.kover)
}

android {
    namespace = "com.solventa.feature.billetera"

    defaultConfig {
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    testOptions {
        // Robolectric necesita los recursos fusionados para resolver cadenas por idioma.
        unitTests.isIncludeAndroidResources = true
        unitTests.all { it.useJUnitPlatform() }

        // Matriz de dispositivos de la estrategia: API 26 (mínimo), 31 y 34 (N-1). Se ejecutan con
        // `:feature:billetera:<nombre>DebugAndroidTest`; Gradle descarga la imagen la primera vez.
        managedDevices {
            localDevices {
                create("api26") {
                    device = "Pixel 6"
                    apiLevel = 26
                    systemImageSource = "aosp"
                }
                create("api31") {
                    device = "Pixel 6"
                    apiLevel = 31
                    systemImageSource = "aosp"
                }
                create("api34") {
                    device = "Pixel 6"
                    apiLevel = 34
                    systemImageSource = "aosp"
                }
            }
        }
    }
}

// Umbral de la estrategia de pruebas para móvil: ≥ 80 % líneas / ≥ 75 % ramas.
kover {
    reports {
        // Las @Preview (src/debug) no son código de la app: sus archivos terminan en `Previews.kt`.
        filters {
            excludes {
                annotatedBy("androidx.compose.ui.tooling.preview.Preview")
                classes("*PreviewsKt*", "*.MuestrasPreview")
            }
        }
        total {
            verify {
                rule("Cobertura de :feature:billetera") {
                    bound {
                        minValue = 80
                        coverageUnits = CoverageUnit.LINE
                    }
                    bound {
                        minValue = 75
                        coverageUnits = CoverageUnit.BRANCH
                    }
                }
            }
        }
    }
}

dependencies {
    implementation(project(":core:network"))
    implementation(project(":core:auth"))
    implementation(project(":core:designsystem"))
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)

    testImplementation(platform(libs.junit5.bom))
    testImplementation(libs.junit5.jupiter)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.junit)
    testRuntimeOnly(libs.junit5.vintage.engine)
    testRuntimeOnly(libs.junit5.platform.launcher)
    testImplementation(libs.androidx.compose.ui.test.manifest)

    // Pruebas instrumentadas (R6): Compose UI Test y MockWebServer, sin dependencias nuevas.
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.okhttp.mockwebserver)
    androidTestImplementation(libs.kotlin.test)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
