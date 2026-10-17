package com.solventa.core.network

import com.solventa.core.network.modelo.ErrorDto
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response

/** Lee el `ErrorDto` del cuerpo de error; devuelve null si no hay cuerpo o no cumple el formato. */
internal fun leerErrorDto(respuesta: Response<*>, json: Json): ErrorDto? {
    val cuerpo = respuesta.errorBody()?.string() ?: return null
    return try {
        json.decodeFromString(ErrorDto.serializer(), cuerpo)
    } catch (e: SerializationException) {
        null
    }
}
