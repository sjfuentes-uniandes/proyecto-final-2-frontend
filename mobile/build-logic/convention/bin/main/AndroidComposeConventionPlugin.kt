import com.android.build.api.dsl.CommonExtension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.VersionCatalogsExtension
import org.gradle.kotlin.dsl.apply
import org.gradle.kotlin.dsl.dependencies
import org.gradle.kotlin.dsl.getByType
import org.gradle.kotlin.dsl.the

/** Añade Jetpack Compose (plugin + BOM) a un módulo app o library que ya aplicó el convention de Android. */
class AndroidComposeConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            apply(plugin = "org.jetbrains.kotlin.plugin.compose")

            val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")

            extensions.getByType(CommonExtension::class.java).apply {
                buildFeatures.compose = true
            }

            dependencies {
                val bom = libs.findLibrary("androidx-compose-bom").get()
                add("implementation", platform(bom))
                add("androidTestImplementation", platform(bom))
            }
        }
    }
}
