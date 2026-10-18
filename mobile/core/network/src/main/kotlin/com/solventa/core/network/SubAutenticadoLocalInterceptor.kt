package com.solventa.core.network

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Solo para desarrollo local: el docker compose del backend corre con `ENVIRONMENT=local`, sin
 * Cognito, y acepta `X-Authenticated-Sub` como identidad del titular. En AWS ese encabezado lo
 * inyecta API Gateway a partir del token, por eso [RedModule] solo registra este interceptor
 * cuando se le pasa un `subLocal` (nunca en builds release).
 */
class SubAutenticadoLocalInterceptor(private val sub: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response =
        chain.proceed(chain.request().newBuilder().header("X-Authenticated-Sub", sub).build())
}
