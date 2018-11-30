# WIDAP Web Pipeline

Contains various scripts for preprocessing data to be displayed for user interactivity, geoJSON markers on the globe, etc.

## How do I...

In all the invocations below, filenames inside brackets are understood to be user-chosen. In other words, when you run
```
python myscript.py > <myoutput.csv>
```
you substitute whatever you want for `<myoutput.csv>`.

### regenerate the geoJSON containing all the plant markers?

First, fetch the details on each plant from the `plants` table with:
```
python fetch_plants_overview.py > <plants_data.csv>
```
These details don't include capacity, which we use to decide how large to render the marker. Grab the capacities from the `data` table with
```
python fetch_plant_capacities.py > <plant_capacities.csv>
```
which might take a long time. You'll probably want to sanity check the two CSVs at this point, e.g. ensuring that the two have the same number of rows (which should map 1-to-1 to distinct `ORISPL_CODE`s.)

Then, in order to generate the geoJSON itself, joining the results from the two scripts above, run:
```
python generate_plants_geojson.py <plants_data.csv> <plant_capacities.csv> > <final_output.json>
```
Make sure the output is moved to the location expected by the map page.

### regenerate the data used for the plots on the map page?

Something like this should do it:
```
while read orispl_code;
do
  echo "Processing ${orispl_code}"
  python prep_plant_overview_data.py ${orispl_code} > ../data/overview/${orispl_code}.json
done < orispl_codes.txt
```

### ...regenerate the plots themselves?

Make sure you've already generated the json files containing the overview data (see above) and sanity checked them. Then run:
```
python make_overview_plots.py orispl_codes.txt
```
This will save plots in the appropriate folders under `../data/overview/svg/`, alerting you to cases where it failed to produce a plot.
