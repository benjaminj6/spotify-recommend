var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
  var emitter = new events.EventEmitter();
  unirest.get('https://api.spotify.com/v1/' + endpoint)
    .qs(args)
    .end(function(response) {
      if (response.ok) {
        emitter.emit('end', response.body);
      } else {
        emitter.emit('error', response.code);
      }
    });
  return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        
        getRelated = getFromApi('artists/' + artist.id + '/related-artists');
        
        getRelated.on('end', function(item) {
          artist.related = item.artists;
          
          onGetRelatedComplete(artist, function() {
            res.json(artist);
          });
        });
        
        getRelated.on('error', function() {
          res.sendStatus(404);
        });
    });

    searchReq.on('error', function() {
        res.sendStatus(404);
    });
});

function onGetRelatedComplete(artist, callback) {
  var complete = 0;

  var checkComplete = function() {
    if (complete === artist.related.length) {
      callback();
    }
  };

  artist.related.forEach(function(artist) {
    // console.log('Inside forEach');
    console.log(artist.id);

    var topTracks = getFromApi('artists/' + artist.id + '/top-tracks?country=US');
    
    topTracks.on('end', function(item) {
      console.log('Inside top tracks end');
      artist.topTracks = item;
      complete += 1;
      checkComplete();
    });
  });
}


app.listen(process.env.PORT || 8080);