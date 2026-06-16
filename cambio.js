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
  const response = await fetch(url, { method: "GET", credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  return response.json();
}

async function fetchBcbExchangeRate() {
  let lookupDate = new Date();
  let attempts = 0;

  while (attempts < 10) {
    const mm = String(lookupDate.getMonth() + 1).padStart(2, "0");
    const dd = String(lookupDate.getDate()).padStart(2, "0");
    const yyyy = lookupDate.getFullYear();
    const formattedDate = `${mm}-${dd}-${yyyy}`;
    const queryParams = `CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formattedDate}'&$format=json`;

    const data = await fetchExchangeRate(`${baseUrl}/${queryParams}`);
    if (data && data.value && data.value.length > 0) {
      const foundData = data.value[0];
      return {
        rate: Number((foundData.cotacaoVenda + 0.23).toFixed(4)),
        date: formattedDate,
        source: "BCB",
        raw: foundData
      };
    }

    lookupDate.setDate(lookupDate.getDate() - 1);
    attempts += 1;
  }

  return null;
}

async function fetchAwesomeExchangeRate() {
  const data = await fetchExchangeRate("https://economia.awesomeapi.com.br/json/last/USD-BRL");
  const quote = data && data.USDBRL;
  if (!quote || !quote.ask) return null;

  return {
    rate: Number((Number(quote.ask) + 0.23).toFixed(4)),
    date: quote.create_date ? quote.create_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    source: "AwesomeAPI",
    raw: quote
  };
}

async function displayLatestRate() {
  const cached = readCachedExchangeRate();
  if (cached) {
    publishExchangeRate(cached);
    return cached;
  }

  let result = null;

  try {
    result = await fetchBcbExchangeRate();
  } catch (error) {
    result = null;
  }

  if (!result) {
    try {
      result = await fetchAwesomeExchangeRate();
    } catch (error) {
      result = null;
    }
  }

  if (!result) {
    publishExchangeRate(null);
    return null;
  }

  saveCachedExchangeRate(result);
  publishExchangeRate(result);
  return result;
}

window.ultraPaineExchangeRatePromise = displayLatestRate();
