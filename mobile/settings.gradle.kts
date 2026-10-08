pluginManagement {
    includeBuild("build-logic")
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "solventa"

include(":app")
include(":core:network")
include(":core:auth")
include(":core:security")
include(":core:designsystem")
include(":feature:login")
include(":feature:onboarding-identidad")
include(":feature:privacidad")
