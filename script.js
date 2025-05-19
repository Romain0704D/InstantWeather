// Configuration
const API_TOKEN = '726b1c99c171e7c9d93155a0b1721f138a48d4c33ad10e533f84fbbd55d62140'; // Remplacer par votre token personnel
const API_BASE_URL = 'https://api.meteo-concept.com/api';

// Éléments du DOM
const weatherForm = document.getElementById('weather-form');
const cityInput = document.getElementById('city');
const daysSlider = document.getElementById('days-slider');
const daysValue = document.getElementById('days-value');
const darkModeToggle = document.getElementById('darkModeToggle');
const resultsSection = document.getElementById('results-section');
const errorSection = document.getElementById('error-section');
const errorText = document.getElementById('error-text');
const cityNameElement = document.getElementById('city-name');
const coordinatesContainer = document.getElementById('coordinates-container');
const latitudeDisplay = document.getElementById('latitude-display');
const longitudeDisplay = document.getElementById('longitude-display');
const mapContainer = document.getElementById('map-container');
const forecastContainer = document.getElementById('forecast-container');

// Variables globales
let map = null;
let mapMarker = null;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initSlider();
    initScrollToTop();
    weatherForm.addEventListener('submit', handleFormSubmit);
    darkModeToggle.addEventListener('click', toggleDarkMode);
});

// Fonction pour initialiser le retour en haut de page
function initScrollToTop() {
    const logoLink = document.getElementById('logo-link');
    
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialisation du slider
function initSlider() {
    daysValue.textContent = daysSlider.value;
    
    daysSlider.addEventListener('input', () => {
        daysValue.textContent = daysSlider.value;
        daysSlider.setAttribute('aria-valuenow', daysSlider.value);
    });
}

// Gestion du mode sombre
function initDarkMode() {
    // Vérifier les préférences utilisateur sauvegardées
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = 'light';
    let icon = '<i class="fas fa-moon"></i>';
    
    if (!currentTheme || currentTheme === 'light') {
        newTheme = 'dark';
        icon = '<i class="fas fa-sun"></i>';
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    darkModeToggle.innerHTML = icon;
}

// Gestion du formulaire
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const city = cityInput.value.trim();
    const days = parseInt(daysSlider.value);
    
    if (!city) {
        showError('Veuillez entrer le nom d\'une ville.');
        return;
    }
    
    try {
        hideError();
        
        // Récupérer les coordonnées de la ville
        const locationData = await fetchCityData(city);
        
        if (!locationData) {
            showError('Ville non trouvée. Veuillez vérifier l\'orthographe.');
            return;
        }
        
        // Récupérer les prévisions météo
        const forecastData = await fetchForecastData(locationData.insee, days);
        
        if (!forecastData || !forecastData.forecast || forecastData.forecast.length === 0) {
            showError('Données météorologiques non disponibles pour cette ville.');
            return;
        }
        
        // Afficher les résultats
        displayResults(locationData, forecastData, days);
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Une erreur est survenue. Veuillez réessayer plus tard.');
    }
}

// Appels API
async function fetchCityData(city) {
    try {
        const response = await fetch(`${API_BASE_URL}/location/cities?token=${API_TOKEN}&search=${encodeURIComponent(city)}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Prendre la première ville correspondante
        return data.cities && data.cities.length > 0 ? data.cities[0] : null;
        
    } catch (error) {
        console.error('Erreur lors de la récupération des données de la ville:', error);
        throw error;
    }
}

async function fetchForecastData(inseeCode, days) {
    try {
        const response = await fetch(`${API_BASE_URL}/forecast/daily?token=${API_TOKEN}&insee=${inseeCode}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Limiter les prévisions au nombre de jours demandés
        if (data.forecast && data.forecast.length > days) {
            data.forecast = data.forecast.slice(0, days);
        }
        
        return data;
        
    } catch (error) {
        console.error('Erreur lors de la récupération des prévisions:', error);
        throw error;
    }
}

// Affichage des résultats
function displayResults(locationData, forecastData, days) {
    // Afficher le nom de la ville
    cityNameElement.textContent = `${locationData.name}, ${locationData.cp}`;
    
    // Afficher les coordonnées si demandé
    displayCoordinates(locationData);
    
    // Initialiser/mettre à jour la carte
    displayMap(locationData);
    
    // Afficher les prévisions
    displayForecast(forecastData.forecast);
    
    // Afficher la section des résultats
    resultsSection.classList.remove('hidden');
    
    // Scroller jusqu'aux résultats
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function displayCoordinates(locationData) {
    const showLatitude = document.getElementById('latitude').checked;
    const showLongitude = document.getElementById('longitude').checked;
    
    if (showLatitude || showLongitude) {
        coordinatesContainer.classList.remove('hidden');
        
        if (showLatitude) {
            latitudeDisplay.textContent = `Latitude: ${locationData.latitude.toFixed(6)}`;
            latitudeDisplay.classList.remove('hidden');
        } else {
            latitudeDisplay.classList.add('hidden');
        }
        
        if (showLongitude) {
            longitudeDisplay.textContent = `Longitude: ${locationData.longitude.toFixed(6)}`;
            longitudeDisplay.classList.remove('hidden');
        } else {
            longitudeDisplay.classList.add('hidden');
        }
    } else {
        coordinatesContainer.classList.add('hidden');
    }
}

function displayMap(locationData) {
    mapContainer.classList.remove('hidden');
    
    // Initialiser la carte si elle n'existe pas encore
    if (!map) {
        map = L.map('map').setView([locationData.latitude, locationData.longitude], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Ajouter un marker
        mapMarker = L.marker([locationData.latitude, locationData.longitude]).addTo(map);
    } else {
        // Mettre à jour la vue et le marker
        map.setView([locationData.latitude, locationData.longitude], 13);
        mapMarker.setLatLng([locationData.latitude, locationData.longitude]);
    }
    
    // Ajouter un popup au marker
    mapMarker.bindPopup(`<b>${locationData.name}</b>`).openPopup();
    
    // Forcer la mise à jour du rendu de la carte
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function displayForecast(forecastData) {
    // Vider le conteneur de prévisions
    forecastContainer.innerHTML = '';
    
    // Options sélectionnées
    const showRainfall = document.getElementById('rainfall').checked;
    const showWindSpeed = document.getElementById('wind-speed').checked;
    const showWindDirection = document.getElementById('wind-direction').checked;
    
    // Créer une carte pour chaque jour
    forecastData.forEach(day => {
        const date = new Date(day.datetime);
        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-card';
        
        // Formater la date en français
        const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        const formattedDate = date.toLocaleDateString('fr-FR', dateOptions);
        
        let additionalInfoHTML = '';
        
        // Informations supplémentaires selon les options sélectionnées
        if (showRainfall) {
            const rainfall = day.rr10 !== undefined ? parseFloat(day.rr10).toFixed(1) : '0';
            additionalInfoHTML += `
                <div class="info-item">
                    <span class="info-label">Pluie:</span>
                    <span class="info-value">${rainfall} mm</span>
                </div>
            `;
        }
        
        if (showWindSpeed) {
            const windSpeed = day.wind10m !== undefined ? day.wind10m : 'N/A';
            additionalInfoHTML += `
                <div class="info-item">
                    <span class="info-label">Vent:</span>
                    <span class="info-value">${windSpeed} km/h</span>
                </div>
            `;
        }
        
        if (showWindDirection) {
            const windDirection = day.dirwind10m !== undefined ? day.dirwind10m : 0;
            additionalInfoHTML += `
                <div class="info-item">
                    <span class="info-label">Direction:</span>
                    <span class="info-value wind-direction-container">
                        ${windDirection}° 
                        <i class="fas fa-arrow-up wind-arrow" style="transform: rotate(${windDirection}deg)"></i>
                    </span>
                </div>
            `;
        }
        
        // Ajouter la section des informations supplémentaires si elle n'est pas vide
        const additionalInfoSection = additionalInfoHTML ? `
            <div class="additional-info">
                ${additionalInfoHTML}
            </div>
        ` : '';
        
        // Déterminer l'icône météo en fonction du code weather
        const weatherIcon = getWeatherIcon(day.weather || 0);
        
        // Déterminer la description de la météo
        const weatherDescription = getWeatherDescription(day.weather || 0);
        
        // Gérer les valeurs potentiellement manquantes de température
        const tempMax = day.tmax !== undefined ? day.tmax : 'N/A';
        const tempMin = day.tmin !== undefined ? day.tmin : 'N/A';
        
        dayCard.innerHTML = `
            <div class="forecast-date">${capitalize(formattedDate)}</div>
            <img src="${weatherIcon}" alt="${weatherDescription}" class="weather-icon" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1146/1146869.png'">
            <div class="temperature">${tempMax}°C</div>
            <div class="weather-description">${weatherDescription}</div>
            <div class="info-item">
                <span class="info-label">Min / Max :</span>
                <span class="info-value">&nbsp;${tempMin}°C / ${tempMax}°C</span>
            </div>
            ${additionalInfoSection}
        `;
        
        forecastContainer.appendChild(dayCard);
    });
}

// Utilitaires
function getWeatherIcon(weatherCode) {
    // Mapper les codes météo aux icônes
    const iconMap = {
        0: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png', // Soleil
        1: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Peu nuageux
        2: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Nuageux
        3: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Très nuageux
        4: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Couvert
        5: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard
        6: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie légère
        7: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie modérée
        8: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie forte
        9: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Orage
        10: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Neige
        11: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Averses de pluie
        12: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie intermittente
        13: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Averses de neige
        14: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Pluie et neige mêlées
        15: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brume
        16: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie verglaçante
        17: 'https://cdn-icons-png.flaticon.com/512/632/632532.png', // Averse de grêle
        18: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Bruine
        19: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Tempête
        20: 'https://cdn-icons-png.flaticon.com/512/632/632532.png', // Grésil
        21: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Ciel voilé
        22: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Nuages épars
        23: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Éclaircies
        24: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Nuages bas
        25: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Ciel couvert progressive
        26: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png', // Dégagé
        27: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Variable
        28: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png', // Ciel dégagé
        29: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Partiellement nuageux
        30: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Humide
        31: 'https://cdn-icons-png.flaticon.com/512/2011/2011448.png', // Venteux
        32: 'https://cdn-icons-png.flaticon.com/512/1684/1684375.png', // Chaleur extrême
        33: 'https://cdn-icons-png.flaticon.com/512/2204/2204346.png', // Froid extrême
        34: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Conditions changeantes
        35: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Chutes de neige légères
        36: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Chutes de neige modérées
        37: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Chutes de neige abondantes
        38: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Crachin
        39: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Orages violents
        40: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Visibilité réduite
        41: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Nuageux par moments
        42: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png', // Dégagement progressif
        43: 'https://cdn-icons-png.flaticon.com/512/414/414927.png', // Dégradation progressive
        44: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Risque d'averses
        45: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Risque d'orages
        46: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Temps ensoleillé devenant orageux
        47: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Averses orageuses
        48: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Quelques flocons
        49: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie faible intermittente
        50: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie faible
        51: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard givrant
        52: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Pluie et neige
        53: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Averses orageuses de neige
        54: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Ciel se voilant
        55: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png', // Ciel se dégageant
        56: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Giboulées
        // Ajouts de nouveaux codes météo
        57: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Orage avec grêle
        58: 'https://cdn-icons-png.flaticon.com/512/632/632532.png', // Grêle intense
        59: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Orage avec vents forts
        60: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie diluvienne
        61: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Blizzard
        62: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Tempête de neige
        63: 'https://cdn-icons-png.flaticon.com/512/2011/2011448.png', // Rafales de vent
        64: 'https://cdn-icons-png.flaticon.com/512/2011/2011448.png', // Vents cycloniques
        65: 'https://cdn-icons-png.flaticon.com/512/2011/2011448.png', // Tempête de vent
        66: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Tempête de sable
        67: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brume de poussière
        68: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Ciel partiellement dégagé
        69: 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png', // Soleil intense
        70: 'https://cdn-icons-png.flaticon.com/512/1684/1684375.png', // Canicule
        71: 'https://cdn-icons-png.flaticon.com/512/2204/2204346.png', // Vague de froid
        72: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Averses localisées
        73: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Congère
        74: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Neige fondante
        75: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard dense
        76: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard d'advection
        77: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard de rayonnement
        78: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard de vallée
        79: 'https://cdn-icons-png.flaticon.com/512/1146/1146858.png', // Brouillard de mer
        80: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie torrentielle
        81: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie continue
        82: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Pluie et vent
        83: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Tonnerre
        84: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png', // Éclairs
        85: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Nuages stratiformes
        86: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Nuages cumuliformes
        87: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Nuages cirriformes
        88: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Nuages lenticulaires
        89: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Ciel voilé par altocumulus
        90: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Ciel voilé par cirrostratus
        91: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Ciel voilé par cirrocumulus
        92: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Stratocumulus
        93: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Altostratus
        94: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png', // Nimbostratus
        95: 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png', // Bruine verglaçante
        96: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Poudrin de glace
        97: 'https://cdn-icons-png.flaticon.com/512/642/642000.png', // Cristaux de glace
        98: 'https://cdn-icons-png.flaticon.com/512/632/632532.png', // Grêle fine
        99: 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png'  // Conditions extrêmes
    };
    
    // Vérifier si le code météo existe dans notre dictionnaire
    if (iconMap[weatherCode]) {
        return iconMap[weatherCode];
    }
    
    // Classement par catégories pour les codes non définis explicitement
    if (weatherCode >= 0 && weatherCode <= 5) {
        return 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png'; // Soleil ou nuages légers
    } else if (weatherCode >= 6 && weatherCode <= 9) {
        return 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png'; // Pluie
    } else if (weatherCode >= 10 && weatherCode <= 20) {
        return 'https://cdn-icons-png.flaticon.com/512/642/642000.png'; // Neige ou conditions hivernales
    } else if (weatherCode >= 21 && weatherCode <= 30) {
        return 'https://cdn-icons-png.flaticon.com/512/414/414927.png'; // Nuageux
    } else if (weatherCode >= 31 && weatherCode <= 40) {
        return 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png'; // Conditions extrêmes
    } else if (weatherCode >= 41 && weatherCode <= 50) {
        return 'https://cdn-icons-png.flaticon.com/512/414/414927.png'; // Nuageux
    } else if (weatherCode >= 51 && weatherCode <= 60) {
        return 'https://cdn-icons-png.flaticon.com/512/3313/3313888.png'; // Pluie/précipitations diverses
    } else if (weatherCode >= 61 && weatherCode <= 70) {
        return 'https://cdn-icons-png.flaticon.com/512/2011/2011448.png'; // Vents et tempêtes
    } else if (weatherCode >= 71 && weatherCode <= 80) {
        return 'https://cdn-icons-png.flaticon.com/512/642/642000.png'; // Conditions hivernales/brumeuses
    } else if (weatherCode >= 81 && weatherCode <= 90) {
        return 'https://cdn-icons-png.flaticon.com/512/1146/1146911.png'; // Orages et pluies intenses
    } else if (weatherCode >= 91 && weatherCode <= 99) {
        return 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png'; // Conditions particulières nuageuses
    } else {
        return 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png'; // Icône par défaut
    }
}

function getWeatherDescription(weatherCode) {
    const descriptions = {
        0: 'Ensoleillé',
        1: 'Peu nuageux',
        2: 'Nuageux',
        3: 'Très nuageux',
        4: 'Couvert',
        5: 'Brouillard',
        6: 'Pluie légère',
        7: 'Pluie modérée',
        8: 'Pluie forte',
        9: 'Orage',
        10: 'Neige',
        11: 'Averses de pluie',
        12: 'Pluie intermittente',
        13: 'Averses de neige',
        14: 'Pluie et neige mêlées',
        15: 'Brume',
        16: 'Pluie verglaçante',
        17: 'Averse de grêle',
        18: 'Bruine',
        19: 'Tempête',
        20: 'Grésil',
        21: 'Ciel voilé',
        22: 'Nuages épars',
        23: 'Éclaircies',
        24: 'Nuages bas',
        25: 'Ciel couvert progressive',
        26: 'Dégagé',
        27: 'Variable',
        28: 'Ciel dégagé',
        29: 'Partiellement nuageux',
        30: 'Humide',
        31: 'Venteux',
        32: 'Chaleur extrême',
        33: 'Froid extrême',
        34: 'Conditions changeantes',
        35: 'Chutes de neige légères',
        36: 'Chutes de neige modérées',
        37: 'Chutes de neige abondantes',
        38: 'Crachin',
        39: 'Orages violents',
        40: 'Visibilité réduite',
        41: 'Nuageux par moments',
        42: 'Dégagement progressif',
        43: 'Dégradation progressive',
        44: "Risque d'averses",
        45: "Risque d'orages",
        46: 'Temps ensoleillé devenant orageux',
        47: 'Averses orageuses',
        48: 'Quelques flocons',
        49: 'Pluie faible intermittente',
        50: 'Pluie faible',
        51: 'Brouillard givrant',
        52: 'Pluie et neige',
        53: 'Averses orageuses de neige',
        54: 'Ciel se voilant',
        55: 'Ciel se dégageant',
        56: 'Giboulées',
        // Ajouts de nouveaux codes météo
        57: 'Orage avec grêle',
        58: 'Grêle intense',
        59: 'Orage avec vents forts',
        60: 'Pluie diluvienne',
        61: 'Blizzard',
        62: 'Tempête de neige',
        63: 'Rafales de vent',
        64: 'Vents cycloniques',
        65: 'Tempête de vent',
        66: 'Tempête de sable',
        67: 'Brume de poussière',
        68: 'Ciel partiellement dégagé',
        69: 'Soleil intense',
        70: 'Canicule',
        71: 'Vague de froid',
        72: 'Averses localisées',
        73: 'Congère',
        74: 'Neige fondante',
        75: 'Brouillard dense',
        76: 'Brouillard d\'advection',
        77: 'Brouillard de rayonnement',
        78: 'Brouillard de vallée',
        79: 'Brouillard de mer',
        80: 'Pluie torrentielle',
        81: 'Pluie continue',
        82: 'Pluie et vent',
        83: 'Tonnerre',
        84: 'Éclairs',
        85: 'Nuages stratiformes',
        86: 'Nuages cumuliformes',
        87: 'Nuages cirriformes',
        88: 'Nuages lenticulaires',
        89: 'Ciel voilé par altocumulus',
        90: 'Ciel voilé par cirrostratus',
        91: 'Ciel voilé par cirrocumulus',
        92: 'Stratocumulus',
        93: 'Altostratus',
        94: 'Nimbostratus',
        95: 'Bruine verglaçante',
        96: 'Poudrin de glace',
        97: 'Cristaux de glace',
        98: 'Grêle fine',
        99: 'Conditions extrêmes'
    };
    
    if (descriptions[weatherCode]) {
        return descriptions[weatherCode];
    }
    
    // Descriptions génériques par plage pour les codes non définis
    if (weatherCode >= 0 && weatherCode <= 5) {
        return 'Ciel dégagé à peu nuageux';
    } else if (weatherCode >= 6 && weatherCode <= 9) {
        return 'Précipitations';
    } else if (weatherCode >= 10 && weatherCode <= 20) {
        return 'Conditions hivernales';
    } else if (weatherCode >= 21 && weatherCode <= 30) {
        return 'Conditions nuageuses';
    } else if (weatherCode >= 31 && weatherCode <= 40) {
        return 'Conditions météorologiques extrêmes';
    } else if (weatherCode >= 41 && weatherCode <= 50) {
        return 'Partiellement nuageux';
    } else if (weatherCode >= 51 && weatherCode <= 60) {
        return 'Précipitations diverses';
    } else if (weatherCode >= 61 && weatherCode <= 70) {
        return 'Vents et tempêtes';
    } else if (weatherCode >= 71 && weatherCode <= 80) {
        return 'Conditions hivernales ou brumeuses';
    } else if (weatherCode >= 81 && weatherCode <= 90) {
        return 'Orages et pluies intenses';
    } else if (weatherCode >= 91 && weatherCode <= 99) {
        return 'Conditions atmosphériques particulières';
    }
    
    return 'Conditions météorologiques non spécifiées';
}

function showError(message) {
    errorText.textContent = message;
    errorSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
}

function hideError() {
    errorSection.classList.add('hidden');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}