package com.solventa.feature.billetera.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.solventa.feature.billetera.BilleteraViewModel
import com.solventa.feature.billetera.DetallePolizaViewModel
import com.solventa.feature.billetera.EventoBilletera

/** Conecta [BilleteraScreen] con [BilleteraViewModel]; una sesión inválida lleva al login. */
@Composable
fun BilleteraRoute(
    viewModel: BilleteraViewModel,
    onAbrirPoliza: (String) -> Unit,
    onAbrirPrivacidad: () -> Unit,
    onIrALogin: () -> Unit,
) {
    val estado by viewModel.uiState.collectAsState()
    LaunchedEffect(viewModel) {
        viewModel.eventos.collect { evento ->
            when (evento) {
                EventoBilletera.IrALogin -> onIrALogin()
            }
        }
    }
    BilleteraScreen(
        estado = estado,
        onAbrirPoliza = onAbrirPoliza,
        onReintentar = viewModel::reintentar,
        onAbrirPrivacidad = onAbrirPrivacidad,
    )
}

/** Conecta [DetallePolizaScreen] con [DetallePolizaViewModel]; una sesión inválida lleva al login. */
@Composable
fun DetallePolizaRoute(
    viewModel: DetallePolizaViewModel,
    onVolver: () -> Unit,
    onIrALogin: () -> Unit,
) {
    val estado by viewModel.uiState.collectAsState()
    LaunchedEffect(viewModel) {
        viewModel.eventos.collect { evento ->
            when (evento) {
                EventoBilletera.IrALogin -> onIrALogin()
            }
        }
    }
    DetallePolizaScreen(estado = estado, onReintentar = viewModel::reintentar, onVolver = onVolver)
}
