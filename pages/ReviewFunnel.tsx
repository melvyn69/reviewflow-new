// ...
    // CORRECTION TYPE: Ajout explicite du type compatible ou null
    const [locationInfo, setLocationInfo] = useState<{name: string, city: string, googleUrl?: string} | null>(null);

    useEffect(() => {
        if (locationId) {
            api.public.getLocationInfo(locationId)
                .then((info) => setLocationInfo(info as any)) // Cast to avoid strict type mismatch if API return differs slightly
                .catch(() => setLocationInfo({ name: "Notre Établissement", city: "Paris", googleUrl: "#" }));
        }
    }, [locationId]);
// ...