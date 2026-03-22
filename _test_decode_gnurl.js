// Google News article URLs encode the real URL in the path
// Format: /rss/articles/CBMi{base64}?oc=5
// The base64 part contains a protobuf-encoded structure with the real URL

function decodeGoogleNewsUrl(gnUrl) {
    // Extract the article ID from URL
    var m = gnUrl.match(/\/articles\/([^?]+)/);
    if (!m) { return gnUrl; }
    var articleId = m[1];
    
    // Try base64 decode
    try {
        var decoded = Buffer.from(articleId, 'base64').toString('utf8');
        // Look for http URL in decoded string
        var urlMatch = decoded.match(/https?:\/\/[^\s\x00-\x1f]+/);
        if (urlMatch) {
            // Clean up: remove trailing non-URL chars
            var url = urlMatch[0].replace(/[\x00-\x1f]/g, '');
            return url;
        }
    } catch(e) {}
    return gnUrl;
}

// Test
var testIds = [
    'https://news.google.com/rss/articles/CBMiogFBVV95cUxQNURtR0lOc0ZDMzlhNklPWlBfZ2Z?oc=5',
    'https://news.google.com/rss/articles/CBMixgFBVV95cUxQb3A3d0tFZWpnSHRYUDlVbHhkWUs4NUlYYkRxUVlpcXdSQ1NuMWdqZXRaXzdlZDVkS1lRMTZiYWllKb3pWMXlLNktkblF4UEVkZEJoRzUwd2U0ZTljYi0zbkdTdGVieV85T1g2LVhkSGxON3ZDeVctWDJORzg4LU1YallCMTVYYkdSbkRGSVZ2cTV5c2lsM1h1R1hlXzNKSEtiMTBRVkFKblF0N1htWWNjM21ienpNMWVMLM0d3OVRvTExlVFVPdmc?oc=5',
    'https://news.google.com/rss/articles/CBMieEFVX3lxTE80V3hCV1JUWkpMTFBkQWF6MEJDSHloS3dUS1lwcF?oc=5'
];

for (var i = 0; i < testIds.length; i++) {
    var result = decodeGoogleNewsUrl(testIds[i]);
    console.log('#' + (i+1) + ': ' + result.substring(0, 120));
}
