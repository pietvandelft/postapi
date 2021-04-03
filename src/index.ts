import express, { Application, Request, Response } from 'express';
const app: Application = express();
const PORT: number = 3000;
import got from 'got';
const apiAdamUrl = "https://api.data.amsterdam.nl/atlas/search/adres/?q=";
import haversine from 'haversine';

export interface adamPlaceData {
    count: number,
    results: Array<any>
}

app.listen(
    PORT,
    () => console.log(`running on ${PORT}`)
)

app.use(express.json());

app.get('/distance', (req: Request, res: Response) => {
    
    
    (async () => {

        const address1 = req.body.address1;
        const address2 = req.body.address2;

        let latLongX = getLatLong (address1)
        let latLongY = getLatLong (address2)

        Promise.all([latLongX, latLongY]).then(values => {
            
            let distance: number = haversine(values[0], values[1], {unit: 'meter', format: '[lat,lon]'});
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


function getLatLong (address: string){
    return new Promise(
        async function (resolve, reject){
            let apiResult: adamPlaceData = await got.get(apiAdamUrl + address).json();

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
}