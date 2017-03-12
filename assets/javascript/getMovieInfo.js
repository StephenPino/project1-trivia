function randomDate(start, end) {
        var date = +start + Math.floor(Math.random() * (end - start));
        return date;
    }

function getMovieDetails(movieYear) {
    // Constructing a URL to search 
    var year = movieYear;
    var x = 0;
    var queryURL = "https://api.themoviedb.org/3/discover/movie?api_key=1c916b5ee7a77ed6aa84e46c17622f72&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1&primary_release_year=" + year;
    //Performing our AJAX GET request
    $.ajax({
            url: queryURL,
            method: "GET"
        })
        .done(function(response) {
            //console.log(response);
            //Storing the data returned data from AJAX request
            var results = response.results;
            //generate random number to select random title from top 20 results
            var x = 1 + Math.floor(Math.random() * (20 - 1));
            //console log for testing
            //console.log("Random number " + x);
            movieTitle = (results[x].title);
            movieImg = (results[x].poster_path);
            movieImg = "//https://image.tmdb.org/t/p/w500" + movieImg;
            //console log for testing
            //console.log("title " + movieTitle);
            console.log("poster" + movieImg);
            //getMoviePlot(movieTitle);
            main_game.setAnswer(movieTitle);
        });
}

function getMoviePlot(movieTitle) {
    var queryTitle = movieTitle; //+ "_(film)";
    //console.log(queryTitle);
    wtf_wikipedia.from_api(queryTitle, "en", function(markup) {
        var object = wtf_wikipedia.parse(markup);
        //console.log(object);
        for (i = 0; i < object.text.get("Plot").length; i++) {
            //console.log(object.text.get("Plot")[i].text);
            moviePlot = moviePlot + JSON.stringify(object.text.get("Plot")[i].text);
        }
    });
}