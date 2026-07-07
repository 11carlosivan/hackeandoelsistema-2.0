import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve plan details from router state or use default
  const selectedPlan = location.state?.selectedPlan || {
    id: 'plan-basic',
    name: 'AGENTE INICIADO',
    price: '49',
    currency: 'USD',
    quota: '1 Publicación'
  };

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState('card'); // card, crypto
  const [cardNumber, setCardNumber] = useState('');
  const [cryptoAddress] = useState('bc1qxy2kg3ut5uv74a3t874h3s04snpx39egtkhf22'); // mock bitcoin address
  
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // idle, processing, success, failed
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    document.title = "PASARELA DE PAGO | Hackeando el Sistema";
    
    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/checkout');

    // Set robots meta
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'NOINDEX, NOFOLLOW');

    return () => {
      if (robots) {
        robots.setAttribute('content', 'INDEX, FOLLOW');
      }
    };
  }, []);

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setCheckoutStatus('processing');
    setLogs([
      'INICIANDO TRANSACCIÓN...',
      'ENLAZANDO CON PASARELA DE PAGOS SEGURA...',
      paymentMethod === 'card' ? 'AUTORIZANDO CARGO EN TARJETA...' : 'BUSCANDO CONFIRMACIÓN EN BLOCKCHAIN (MEMPOOL)...',
      'VALIDANDO DISPONIBILIDAD DE FONDOS...'
    ]);

    setTimeout(() => {
      if (paymentMethod === 'card' && cardNumber.includes('0000')) {
        // Simulate failure if card number contains 0000
        setLogs(prev => [
          ...prev,
          'ERROR_GATEWAY: TARJETA DENEGADA POR FONDOS INSUFICIENTES.',
          'TRANSACCIÓN ABORTADA.'
        ]);
        setTimeout(() => {
          setCheckoutStatus('failed');
        }, 1000);
      } else {
        // Success path
        setLogs(prev => [
          ...prev,
          'TRANSACCIÓN COMPROBADA CON ÉXITO.',
          'GENERANDO CRÉDITOS EDITORIALES EN LA CUENTA...',
          'ENLACE DE CONFIRMACIÓN ENVIADO AL EMAIL.',
          'TRANSACCIÓN COMPLETADA.'
        ]);
        setTimeout(() => {
          setCheckoutStatus('success');
        }, 1200);
      }
    }, 1500);
  };

  const handleRetry = () => {
    setCheckoutStatus('idle');
    setCardNumber('');
    setLogs([]);
  };

  return (
    <div className="w-full bg-background text-on-surface py-12">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Form and inputs */}
        <div className="md:col-span-7 bg-surface-container-lowest border border-terminal-gray p-8 relative">
          <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-system-red/40 select-none">
            PAY_GATEWAY_v1.0
          </div>

          <h2 className="font-headline-md text-headline-md text-white mb-6 border-b border-terminal-gray pb-2 uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-system-red text-[20px]">credit_card</span>
            Pasarela de Pago Seguro
          </h2>

          {checkoutStatus === 'idle' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Payment selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-3 border font-label-caps text-label-caps font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    paymentMethod === 'card'
                      ? 'bg-system-red text-black border-system-red'
                      : 'border-terminal-gray text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined">payments</span>
                  TARJETA DÉBITO/CRÉDITO
                </button>
                
                <button
                  type="button"
                  onClick={() => setPaymentMethod('crypto')}
                  className={`py-3 border font-label-caps text-label-caps font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    paymentMethod === 'crypto'
                      ? 'bg-system-red text-black border-system-red'
                      : 'border-terminal-gray text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined">currency_bitcoin</span>
                  CRIPTOMONEDAS
                </button>
              </div>

              {paymentMethod === 'card' ? (
                <div className="space-y-4 font-mono text-[11px]">
                  <div className="relative">
                    <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">NOMBRE EN TARJETA</label>
                    <input
                      className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white"
                      placeholder="J. Agente HES"
                      type="text"
                      required
                    />
                  </div>

                  <div className="relative">
                    <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">NÚMERO DE TARJETA</label>
                    <input
                      className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white"
                      placeholder="0000 0000 0000 0000 (0000 para fallar)"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">EXPIRACIÓN</label>
                      <input
                        className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white placeholder:opacity-40"
                        placeholder="MM/AA"
                        type="text"
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="relative">
                      <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">CÓDIGO (CVC)</label>
                      <input
                        className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white placeholder:opacity-40"
                        placeholder="123"
                        type="password"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-mono text-[11px] bg-matrix-dim border border-terminal-gray p-4">
                  <p className="text-[10px] text-on-surface-variant leading-relaxed mb-2">
                    Envíe el monto exacto equivalente a <span className="text-white font-bold">${selectedPlan.price} USD</span> en Bitcoin a la dirección indicada. La transacción se procesará en cuanto se verifique en la mempool.
                  </p>
                  
                  <div className="relative">
                    <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">DIRECCIÓN BITCOIN (BTC)</label>
                    <div className="flex gap-2 items-center bg-black/60 p-2 border border-terminal-gray">
                      <span className="text-white text-[10px] select-all break-all flex-1 font-mono">{cryptoAddress}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(cryptoAddress)}
                        className="text-system-red text-[11px] hover:underline font-label-caps shrink-0 font-bold"
                      >
                        COPIAR
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-system-red text-black font-headline-md font-bold py-3.5 hover:bg-white hover:text-black transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">payments</span>
                EFECTUAR PAGO: {selectedPlan.currency} ${selectedPlan.price}
              </button>
            </form>
          )}

          {checkoutStatus === 'processing' && (
            <div className="py-12 space-y-4 font-mono text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-2 text-system-red font-bold animate-pulse text-[12px] mb-4">
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                <span>COMUNICANDO TRANSACCIÓN CON LOS SERVIDORES BANCARIOS...</span>
              </div>
              <div className="bg-black/60 border border-terminal-gray p-4 space-y-1 select-none">
                {logs.map((log, idx) => (
                  <p key={idx} className={idx === logs.length - 1 ? 'text-white' : ''}>
                    {`> `} {log}
                  </p>
                ))}
              </div>
            </div>
          )}

          {checkoutStatus === 'success' && (
            <div className="py-8 text-center space-y-6">
              <span className="material-symbols-outlined text-data-green text-[60px] animate-pulse">
                task_alt
              </span>
              <h3 className="font-headline-md text-2xl text-white uppercase font-bold">
                PAGO PROCESADO
              </h3>
              <p className="text-body-md text-on-surface-variant max-w-md mx-auto leading-relaxed">
                Su orden ha sido procesada con éxito y se han acreditado {selectedPlan.quota} a su cuenta de agente. Ya puede redactar y enviar su artículo.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to="/crear-publicacion"
                  className="bg-system-red text-black px-6 py-2.5 font-label-caps text-label-caps hover:bg-white font-bold transition-all active:scale-95"
                >
                  ENVIAR ARTÍCULO
                </Link>
                <Link
                  to="/"
                  className="border border-terminal-gray text-on-surface px-6 py-2.5 font-label-caps text-label-caps hover:border-system-red font-bold transition-all active:scale-95"
                >
                  VOLVER A INICIO
                </Link>
              </div>
            </div>
          )}

          {checkoutStatus === 'failed' && (
            <div className="py-8 space-y-6 text-center">
              <span className="material-symbols-outlined text-system-red text-[60px] animate-bounce">
                gpp_bad
              </span>
              <h3 className="font-headline-md text-2xl text-white uppercase font-bold">
                TRANSACCIÓN RECHAZADA
              </h3>
              <p className="text-body-md text-on-surface-variant max-w-md mx-auto leading-relaxed">
                No fue posible autorizar el cargo. Verifique sus datos o saldo de tarjeta e inténtelo de nuevo.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleRetry}
                  className="bg-system-red text-black px-6 py-2.5 font-label-caps text-label-caps hover:bg-white font-bold transition-all active:scale-95"
                >
                  RE-INTENTAR PAGO
                </button>
                <Link
                  to="/planes"
                  className="border border-terminal-gray text-on-surface px-6 py-2.5 font-label-caps text-label-caps hover:border-system-red font-bold transition-all active:scale-95"
                >
                  SELECCIONAR PLAN
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Order Summary */}
        <div className="md:col-span-5 space-y-gutter w-full">
          
          {/* Order Summary Card */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold">
              RESUMEN DE LA ORDEN
            </h3>

            <div className="space-y-3 font-mono text-[10px] text-on-surface-variant">
              <div className="flex justify-between border-b border-terminal-gray/40 pb-1">
                <span>PLAN:</span>
                <span className="text-white font-bold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between border-b border-terminal-gray/40 pb-1">
                <span>CUOTA DE POSTS:</span>
                <span className="text-white font-bold">{selectedPlan.quota}</span>
              </div>
              <div className="flex justify-between border-b border-terminal-gray/40 pb-1">
                <span>VIGENCIA:</span>
                <span className="text-white">{selectedPlan.duration || '30 Días'}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-2">
                <span className="text-system-red font-bold">TOTAL A PAGAR:</span>
                <span className="text-white font-bold">{selectedPlan.currency} ${selectedPlan.price}</span>
              </div>
            </div>
          </div>

          {/* Secure transaction notice */}
          <div className="bg-surface-container/50 p-6 border border-terminal-gray/40 space-y-3 font-mono text-[9px] text-on-surface-variant leading-relaxed">
            <div className="flex items-center gap-2 text-[10px] text-white font-bold">
              <span className="material-symbols-outlined text-system-red text-[16px]">verified_user</span>
              <span>CONEXIÓN CIFRADA TLS</span>
            </div>
            <p>
              Toda la información del pago viaja a través de túneles encriptados hacia pasarelas internacionales externas. Hackeando el Sistema no almacena información de tarjetas de crédito en sus servidores descentralizados.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
