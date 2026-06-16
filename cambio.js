const baseUrl = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";
const cacheKey = "ultraPaineExchangeRate";
const cacheMaxAgeMs = 12 * 60 * 60 * 1000;

function readCachedExchangeRate() {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (!cached || !cached.rate || !cached.savedAt) return null;
    if (Date.now() - cached.savedAt > cacheMaxAgeMs) return null;
    return cached;
  } catch (error) {
    return null;
  }
}

function saveCachedExchangeRate(result) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ...result, savedAt: Date.now() }));
  } catch (error) {
    // Ignore storage failures; the page can still use the live result.
  }
}

function publishExchangeRate(result) {
  window.ultraPaineExchangeRate = result;
  window.dispatchEvent(new CustomEvent("ultra-paine-exchange-rate", { detail: result }));
}

async function fetchExchangeRate(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  return response.json();
}

async function displayLatestRate() {
  const cached = readCachedExchangeRate();
  if (cached) {
    publishExchangeRate(cached);
    return cached;
  }

  let lookupDate = new Date();
  let foundData = null;
  let finalFormattedDate = "";
  let attempts = 0;

  while (!foundData && attempts < 10) {
    const mm = String(lookupDate.getMonth() + 1).padStart(2, "0");
    const dd = String(lookupDate.getDate()).padStart(2, "0");
    const yyyy = lookupDate.getFullYear();
    finalFormattedDate = `${mm}-${dd}-${yyyy}`;

    const queryParams = `CotacaoMoedaAberturaOuIntermediario(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='USD'&@dataCotacao='${finalFormattedDate}'&$format=json`;

    try {
      const data = await fetchExchangeRate(`${baseUrl}/${queryParams}`);
      if (data && data.value && data.value.length > 0) {
        foundData = data.value[0];
        break;
      }
    } catch (error) {
      break;
    }

    lookupDate.setDate(lookupDate.getDate() - 1);
    attempts += 1;
  }

  if (!foundData) {
    publishExchangeRate(null);
    return null;
  }

  const exchangeRate = Number((foundData.cotacaoVenda + 0.23).toFixed(4));
  const result = {
    rate: exchangeRate,
    date: finalFormattedDate,
    raw: foundData
  };

  saveCachedExchangeRate(result);
  publishExchangeRate(result);
  return result;
}

window.ultraPaineExchangeRatePromise = displayLatestRate();
