function parseMovieInfo(infoText) {
  // This regex attempts to match the typical pattern, but with more flexibility
  const match = infoText.match(/\(([^,]*)(?:, Dir\.: ([^,]*))?(?:, ([^,]*))?(?:, (\d{4}))?(?:, Dur\.: ([^)]+))?\)/);
  
  if (match) {
    const int_name = match[1]?.trim() || "";
    const dir = match[2]?.trim() || "";
    const pais = match[3]?.trim() || "";
    const year = match[4]?.trim() || "";
    const dur = match[5]?.trim() || "";
    return [int_name, dir, pais, year, dur];
  }
  
  // Return default empty values if no match
  return ["", "", "", "", ""];
}

async function fetchMovieData(url) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const movieElements = dom.window.document.querySelectorAll(".col-12.col-md-6.col-lg-4.float-left");

    const movies = [];
    movieElements.forEach((element) => {
      const anchorElement = element.querySelector("a");
      const filmid = anchorElement?.href.match(/FilmId=([^&]+)/)?.[1] || "";

      const movie = element.querySelector("p.font-weight-bold")?.textContent?.trim() || "";

      const infoText = element.querySelector(".small")?.textContent?.trim() || "";
      const [int_name, dir, pais, year, dur] = parseMovieInfo(infoText);

      const dateString = element.querySelector("p.pb-1 span.font-weight-bold")?.textContent?.trim() || "";
      const date = dateString ? format(parse(dateString, "EEEE d 'de' MMMM 'de' yyyy", new Date(), { locale: es }), 'dd/MM/yyyy') : "";

      const salaElement = element.querySelector(".pb-1");
      let sala = salaElement?.childNodes[5]?.textContent?.trim() || "";
      sala = sala.endsWith(":") ? sala.slice(0, -1) : sala;

      const times = Array.from(salaElement.querySelectorAll("a")).map(a => a.textContent?.trim() || "");

      movies.push({
        filmid,
        movie,
        int_name,
        dir,
        pais,
        year: year ? parseInt(year) : null,
        dur: dur.replace(/\D/g, ''),
        date,
        sala,
        times,
      });
    });

    return movies;
  } catch (error) {
    console.error('Error fetching movie data:', error);
    throw error;
  }
}