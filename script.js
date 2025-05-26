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
const SEARCH_HISTORY_KEY = 'searchHistory';
const SEARCH_OPTIONS_KEY = 'searchOptions';

// Variables globales
let map = null;
let mapMarker = null;

// --- HISTORIQUE DE RECHERCHE : dropdown déjà présent dans le HTML ---
const searchHistoryDropdown = document.getElementById('search-history-dropdown');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initSlider();
    initScrollToTop();
    restoreSearchOptions();
    weatherForm.addEventListener('submit', handleFormSubmit);
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Historique recherche : gestion affichage/masquage
    cityInput.addEventListener('focus', updateSearchHistoryDropdown);
    cityInput.addEventListener('input', () => {
        if (cityInput.value.trim() === '') updateSearchHistoryDropdown();
        else searchHistoryDropdown.classList.add('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!searchHistoryDropdown.contains(e.target) && e.target !== cityInput) {
            searchHistoryDropdown.classList.add('hidden');
        }
    });
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
    addToSearchHistory(city); // historique
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
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
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
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
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
    const showLatitude = document.getElementById('latitude').value === 'on';
    const showLongitude = document.getElementById('longitude').value === 'on';
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
    forecastContainer.innerHTML = '';
    const showRainfall = document.getElementById('rainfall').value === 'on';
    const showWindSpeed = document.getElementById('wind-speed').value === 'on';
    const showWindDirection = document.getElementById('wind-direction').value === 'on';

    forecastData.forEach(day => {
        const date = new Date(day.datetime);
        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-card';

        const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        const formattedDate = date.toLocaleDateString('fr-FR', dateOptions);

        const tempMax = day.tmax !== undefined ? day.tmax : 'N/A';
        const tempMin = day.tmin !== undefined ? day.tmin : 'N/A';
        let tempAvg = 'N/A';
        if (!isNaN(tempMax) && !isNaN(tempMin)) {
            tempAvg = Math.round((parseFloat(tempMax) + parseFloat(tempMin)) / 2);
        }

        // Correction code météo/temperature
        let weatherCode = day.weather || 0;
        let correctedWeatherCode = weatherCode;
        if (
            (weatherCode === 10 || weatherCode === 13 || weatherCode === 35 || weatherCode === 36 || weatherCode === 37 || weatherCode === 52 || weatherCode === 53 || weatherCode === 61 || weatherCode === 62 || weatherCode === 73 || weatherCode === 74 || weatherCode === 96 || weatherCode === 97 || weatherCode === 48)
            && tempMax > 4
        ) {
            correctedWeatherCode = 6;
        }
        if (
            (weatherCode === 14 || weatherCode === 52 || weatherCode === 53)
            && tempMax > 4
        ) {
            correctedWeatherCode = 6;
        }
        if (
            (weatherCode === 6 || weatherCode === 7 || weatherCode === 8 || weatherCode === 11 || weatherCode === 12 || weatherCode === 18 || weatherCode === 49 || weatherCode === 50 || weatherCode === 56 || weatherCode === 80 || weatherCode === 81 || weatherCode === 82)
            && tempMax <= 0
        ) {
            correctedWeatherCode = 10;
        }

        const weatherIcon = getWeatherIcon(correctedWeatherCode, day);
        const weatherDescription = getWeatherDescription(correctedWeatherCode, day);

        let additionalInfoHTML = '';
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
        const additionalInfoSection = additionalInfoHTML ? `
            <div class="additional-info">
                ${additionalInfoHTML}
            </div>
        ` : '';

        dayCard.innerHTML = `
            <div class="forecast-date">${capitalize(formattedDate)}</div>
            <img src="${weatherIcon}" alt="${weatherDescription}" class="weather-icon" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1146/1146869.png'">
            <div class="temperature">${tempAvg}°C</div>
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

// Utilitaires météo (garde les mêmes)
function getWeatherIcon(weatherCode, day) {
    const rainCodes = [6, 7, 8, 11, 12, 14, 16, 18, 44, 49, 50, 56, 60, 72, 80, 81, 82];
    const snowCodes = [10, 13, 35, 36, 37, 48, 52, 53, 61, 62, 73, 74, 96, 97];
    const thunderCodes = [9, 39, 45, 46, 47, 53, 57, 59, 83, 84, 99];
    const fogCodes = [5, 15, 30, 40, 51, 66, 67, 75, 76, 77, 78, 79];
    const cloudCodes = [2, 3, 4, 22, 23, 24, 25, 27, 29, 34, 41, 43, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94];
    const sunCodes = [0, 1, 21, 26, 28, 32, 42, 54, 55, 68, 69, 70, 71, 95, 98];
    const windCodes = [19, 31, 63, 64, 65];

    if (rainCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/256/3262/3262912.png';
    }
    if (snowCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/512/642/642000.png';
    }
    if (thunderCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/256/1146/1146860.png';
    }
    if (fogCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/256/7774/7774309.png';
    }
    if (cloudCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/512/414/414927.png';
    }
    if (sunCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/512/6974/6974833.png';
    }
    if (windCodes.includes(weatherCode)) {
        return 'https://cdn-icons-png.flaticon.com/256/5019/5019873.png';
    }
    return 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png';
}

function getWeatherDescription(weatherCode, day) {
    const rainCodes = [6, 7, 8, 11, 12, 14, 16, 18, 44, 49, 50, 56, 60, 72, 80, 81, 82];
    const snowCodes = [10, 13, 35, 36, 37, 48, 52, 53, 61, 62, 73, 74, 96, 97];
    const thunderCodes = [9, 39, 45, 46, 47, 53, 57, 59, 83, 84, 99];
    const fogCodes = [5, 15, 30, 40, 51, 66, 67, 75, 76, 77, 78, 79];
    const cloudCodes = [2, 3, 4, 22, 23, 24, 25, 27, 29, 34, 41, 43, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94];
    const sunCodes = [0, 1, 21, 26, 28, 32, 42, 54, 55, 68, 69, 70, 71, 95, 98];
    const windCodes = [19, 31, 63, 64, 65];

    const clouds = day.clouds !== undefined ? day.clouds : null;
    const probarain = day.probarain !== undefined ? day.probarain : null;

    if (rainCodes.includes(weatherCode)) return 'Pluie';
    if (snowCodes.includes(weatherCode)) return 'Neige';
    if (thunderCodes.includes(weatherCode)) return 'Orage';
    if (fogCodes.includes(weatherCode)) return 'Brouillard / Brume';
    if (windCodes.includes(weatherCode)) return 'Vent fort';

    if (sunCodes.includes(weatherCode) || weatherCode === 1) {
        if (clouds !== null) {
            if (clouds < 20) return 'Ensoleillé';
            if (clouds >= 20 && clouds < 40) return 'Soleil voilé';
            if (clouds >= 40 && clouds <= 70) return 'Soleil avec nuages';
            if (clouds > 70) return 'Très nuageux';
        }
        return 'Ensoleillé';
    }
    if (cloudCodes.includes(weatherCode)) {
        if (clouds !== null) {
            if (clouds < 30) return 'Ciel peu nuageux';
            if (clouds >= 30 && clouds < 60) return 'Ciel partiellement nuageux';
            if (clouds >= 60 && clouds < 85) return 'Ciel très nuageux';
            if (clouds >= 85) return 'Ciel couvert';
        }
        return 'Nuageux';
    }
    return 'Conditions météorologiques';
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

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 4500);
});

// Animation de vent sur clic bouton
function triggerWindAnimation() {
    const windDiv = document.getElementById('wind-animation');
    if (!windDiv) return;
    windDiv.classList.remove('hidden');
    windDiv.classList.add('show');
    setTimeout(() => {
        windDiv.classList.remove('show');
        setTimeout(() => windDiv.classList.add('hidden'), 400);
    }, 1400);
}

// Gestion des boutons d'infos météo (remplace les checkboxes)
const infoBtnMap = {
    'latitude': document.getElementById('latitude-btn'),
    'longitude': document.getElementById('longitude-btn'),
    'rainfall': document.getElementById('rainfall-btn'),
    'wind-speed': document.getElementById('wind-speed-btn'),
    'wind-direction': document.getElementById('wind-direction-btn'),
};
const hiddenInputs = {
    'latitude': document.getElementById('latitude'),
    'longitude': document.getElementById('longitude'),
    'rainfall': document.getElementById('rainfall'),
    'wind-speed': document.getElementById('wind-speed'),
    'wind-direction': document.getElementById('wind-direction'),
};
Object.keys(infoBtnMap).forEach(key => {
    infoBtnMap[key].addEventListener('click', function() {
        this.classList.toggle('active');
        this.classList.remove('pop');
        void this.offsetWidth;
        this.classList.add('pop');
        setTimeout(() => this.classList.remove('pop'), 400);
        if (this.classList.contains('active')) {
            hiddenInputs[key].value = 'on';
        } else {
            hiddenInputs[key].value = 'off';
        }
        saveSearchOptions();
    });
});

// --- HISTORIQUE DE RECHERCHE ---

function updateSearchHistoryDropdown() {
    const history = getSearchHistory();
    searchHistoryDropdown.innerHTML = '';
    if (history.length === 0) {
        searchHistoryDropdown.classList.add('hidden');
        return;
    }
    history.forEach(entry => {
        const opt = document.createElement('div');
        opt.className = 'dropdown-item';
        opt.textContent = entry;
        opt.addEventListener('mousedown', (e) => {
            e.preventDefault();
            cityInput.value = entry;
            searchHistoryDropdown.classList.add('hidden');
        });
        searchHistoryDropdown.appendChild(opt);
    });
    searchHistoryDropdown.classList.remove('hidden');
}
function getSearchHistory() {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw).slice(0, 3);
    } catch {
        return [];
    }
}

cityInput.addEventListener('focus', () => {
    // N’affiche que si historique ET input vide
    if (cityInput.value.trim() === '') updateSearchHistoryDropdown();
});
cityInput.addEventListener('input', () => {
    if (cityInput.value.trim() === '') updateSearchHistoryDropdown();
    else searchHistoryDropdown.classList.add('hidden');
});
document.addEventListener('mousedown', (e) => {
    // Masque si on clique ailleurs que l’input ou le dropdown
    if (!searchHistoryDropdown.contains(e.target) && e.target !== cityInput) {
        searchHistoryDropdown.classList.add('hidden');
    }
});

function addToSearchHistory(search) {
    if (!search) return;
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== search.toLowerCase());
    history.unshift(search);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 3)));
}

// --- SAUVEGARDE ET RESTAURATION DES OPTIONS ---
function saveSearchOptions() {
    const options = {};
    Object.keys(hiddenInputs).forEach(key => {
        options[key] = hiddenInputs[key].value === 'on';
    });
    localStorage.setItem(SEARCH_OPTIONS_KEY, JSON.stringify(options));
}
function restoreSearchOptions() {
    const raw = localStorage.getItem(SEARCH_OPTIONS_KEY);
    if (!raw) return;
    try {
        const options = JSON.parse(raw);
        Object.keys(options).forEach(key => {
            if (options[key]) {
                infoBtnMap[key].classList.add('active');
                hiddenInputs[key].value = 'on';
            } else {
                infoBtnMap[key].classList.remove('active');
                hiddenInputs[key].value = 'off';
            }
        });
    } catch {}
}