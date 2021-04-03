const express = require('express');
const app = express();
const PORT = 3000;
const got = require('got');
const apiAdamUrl = "https://api.data.amsterdam.nl/atlas/search/adres/?q=";
const haversine = require('haversine');

app.listen(
    PORT,
    () => console.log(`running on ${PORT}`)
)

app.use(express.json());

app.get('/distance', (req, res) => {
    
    
    (async () => {

        const address1 = req.body.address1;
        const address2 = req.body.address2;

        let latLongX = getLatLong (address1)
        let latLongY = getLatLong (address2)

        Promise.all([latLongX, latLongY]).then(values => {
            
            let distance = haversine(values[0], values[1], {unit: 'meter', format: '[lat,lon]'});
            console.log(distance);

            res.status(200).send({
                latLongX: values[0],
                latLongY: values[1],
                distanceMeters: distance
            })
        })
        .catch(error => {
            console.log(error);
            res.status(404).send({
                status: "404",
                error: "Address not found",
                message: error
            })
        })
        

    })();

    
});


function getLatLong (address){
    let promise = new Promise(
        async function (resolve, reject){
            got.get(apiAdamUrl + address).json();
            apiResult = await got.get(apiAdamUrl + address).json();

            if (apiResult.count == 0){
                reject ("No valid address found for: " + address);
            }
            else if (apiResult.count > 1){
                reject ("too many addresses found for: " + address);
            }
            else {
                resolve (apiResult.results[0].centroid);
            }
        }
    );
        
    return promise;
}