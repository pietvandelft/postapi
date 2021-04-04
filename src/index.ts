import express, { Application, Request, Response } from 'express';
import got from 'got';
import haversine from 'haversine';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const apiAdamUrl = "https://api.data.amsterdam.nl/atlas/search/adres/?q=";

// interface for the part of the JSON result we use from api.data.amsterdam.nl
export interface adamPlaceData {
    count: number,
    results: Array<any>
}

// Start server
app.listen(
    PORT,
    () => console.log(`running on ${PORT}`)
)
app.use(express.json());

/**
 * Accepts 2 addresses and returns the distance in meters between them
 * address1 = streetname + housenumber
 * address2 = streetname + housenumber
 */
app.get('/distance', (req: Request, res: Response) => {
    (async () => {
        let address1: string = req.query.address1 as string;
        let address2: string = req.query.address2 as string;

        // Check if both inputs are present.
        // We don't do any other validation, as data is not stored.
        if (!address1){
            return res.status(400).send({
                status: "400",
                error: "Address not found",
                message: "address1 not found"
            });
        }
        if (!address2){
            return res.status(400).send({
                status: "400",
                error: "Address not found",
                message: "address2 not found"
            });
        }

        // Call the Amsterdam-api for both addresses
        let latLongX = getLatLong (address1)
        let latLongY = getLatLong (address2)

        Promise.all([latLongX, latLongY]).then(values => {
            // Compute distance and return result as float in meters.
            let distance: number = haversine(values[0], values[1], {unit: 'meter', format: '[lat,lon]'});

            res.status(200).send({
                latLongX: values[0], // lat-long is returned as bonus-data
                latLongY: values[1], // lat-long is returned as bonus-data
                distanceMeters: distance // distance in meters (float)
            })
        })
        .catch(error => {
            res.status(404).send({
                status: "404",
                error: "Address not found",
                message: error
            })
        })
    })();  
});


async function getLatLong (address: string){
    return new Promise(
        async function (resolve, reject){
            let apiResult: adamPlaceData = await got.get(apiAdamUrl + address).json();

            if (apiResult.count == 0){
                return reject ("No valid address found for: " + address);
            }
            else if (apiResult.count > 1){
                /** If a list of multiple addresses is returned, there is a chance
                    that these are different appartments at the same location.
                    (e.g. Sesame street 34-h, Sesame street 34-1)
                    In this case all the addresses will have the same lat-long.
                    We check for this and return this lat-long, otherwise an error is returned.

                    Also, the API returns house number 100 when we search for 10.
                    For better results we would have to filter these out as wel (not done at the moment).
                */
                for (let i = 1; i < apiResult.results.length; i++){
                    if (apiResult.results[i].centroid[0] != apiResult.results[0].centroid[0] ||
                        apiResult.results[i].centroid[1] != apiResult.results[0].centroid[1]){
                            // We've found a lat-long that is different from the first one.
                            return reject ("Too many addresses found for: " + address);
                        }
                }
                // All lat-longs are the same, return the first one as a match.
                return resolve (apiResult.results[0].centroid);
                
            }
            else {
                // We have an exact match.
                resolve (apiResult.results[0].centroid);
            }
        }
    );
}