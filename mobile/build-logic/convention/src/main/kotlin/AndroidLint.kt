import com.android.build.api.dsl.CommonExtension

/**
 * Lint común a módulos app y library: i18n es-CO (values/) y en-US (values-en-rUS/).
 *
 * `MissingTranslation` y `HardcodedText` son error: una traducción faltante o un texto literal en
 * un recurso XML rompe `./gradlew lint`. HardcodedText no ve los literales de Compose; esos se
 * revisan en las pruebas de la UI.
 */
internal fun configureAndroidLint(commonExtension: CommonExtension<*, *, *, *, *, *>) {
    commonExtension.lint {
        error += setOf("MissingTranslation", "HardcodedText")
        abortOnError = true
    }
}
