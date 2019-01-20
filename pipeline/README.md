# WIDAP Web Pipeline

Contains various scripts for preprocessing data to be displayed for user interactivity, geoJSON markers on the globe, etc.

In all the invocations below, filenames inside brackets are understood to be user-chosen. In other words, when you run
```
python myscript.py > <myoutput.csv>
```
you substitute whatever you want for `<myoutput.csv>`.

## How do I...

### ...regenerate the geoJSON containing all the plant markers?

First, fetch the details on each plant from the `plants` table with:
```
python fetch_plants_overview.py > <plants_data.csv>
```
These details don't include capacity or total co2 emissions, which we use to decide how large to render the marker. Grab the supplemental details from the `data` table with
```
python fetch_supplemental_plant_details.py > <extra_plant_details.csv>
```
which might take a long time, on the order of half an hour. You'll probably want to sanity check the two CSVs at this point, e.g. ensuring that the two have the same number of rows (which should map 1-to-1 to distinct `ORISPL_CODE`s.)

Then, in order to generate the geoJSON itself, joining the results from the two scripts above, run:
```
python generate_plants_geojson.py <plants_data.csv> <extra_plant_details.csv> > <final_output.json>
```
Make sure the output is moved to the location expected by the map page.

### ...regenerate the data used for the plots on the map page?

Something like this should do it:
```
while read orispl_code;
do
  echo "Processing ${orispl_code}"
  python prep_plant_overview_csv.py ${orispl_code} > ../csv/monthly/${orispl_code}.csv
done < orispl_codes.txt
```

The Python script `prep_plant_overview_csv.py` reads gload and emissions data from the SQL table, aggregates it by month, then prints the results as a csv.
