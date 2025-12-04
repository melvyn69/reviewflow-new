
                                <Button 
                                    size="lg" 
                                    variant="secondary"
                                    className="w-full" 
                                    onClick={() => handleVerifyCode()}
                                    isLoading={scanning}
                                    disabled={scanCode.length < 5}
                                >
                                    Vérifier le code
                                </Button>

                                {scanResult && (
                                    <div className={`p-4 rounded-xl border-2 flex items-start gap-4 animate-in zoom-in-95 ${scanResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className={`p-2 rounded-full shrink-0 ${scanResult.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {scanResult.valid ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-lg ${scanResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                                                {scanResult.valid ? 'Coupon Valide !' : 'Invalide'}
                                            </h4>
                                            <p className={`text-sm ${scanResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                                                {scanResult.valid ? scanResult.discount : scanResult.reason}
                                            </p>
                                            {scanResult.valid && (
                                                <Button 
                                                    size="xs" 
                                                    className="mt-3 bg-green-600 hover:bg-green-700 border-none w-full shadow-sm"
                                                    onClick={async () => {
                                                        try {
                                                            setScanning(true);
                                                            await api.offers.redeem(scanCode);
                                                            toast.success("Coupon utilisé avec succès !");
                                                            setScanResult(null);
                                                            setScanCode('');
                                                        } catch (e) {
                                                            toast.error("Erreur lors de l'utilisation");
                                                        } finally {
                                                            setScanning(false);
                                                        }
                                                    }}
                                                >
                                                    Valider & Brûler le coupon
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
