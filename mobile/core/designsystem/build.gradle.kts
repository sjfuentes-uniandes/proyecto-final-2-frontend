plugins {
    id("solventa.android.library")
    id("solventa.android.compose")
}

android {
    namespace = "com.solventa.core.designsystem"
}

dependencies {
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.material3)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.compose.ui.tooling.preview)
}
