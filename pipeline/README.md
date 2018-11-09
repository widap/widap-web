# WIDAP Web Pipeline

Contains various scripts for preprocessing data to be displayed for user interactivity, geoJSON markers on the globe, etc.

## How do I...

### regenerate the geoJSON containing all the plant markers?

```
python generate_plants_csv_dump.py <plants_dump.csv>
python plants_csv_to_geojson.py <plants_dump.csv> <cleaned_plants.json>
```
