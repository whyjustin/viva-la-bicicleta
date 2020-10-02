# Viva La Bicicleta

A script to pull activity information from Strava and post to a Slack thread.

## Technical Notes

### history.json

Due to the fact the Stava API does not provide timestamp, a history.json file is kept locally
with approximated buckets of when the events occurred (derived from when the script is run).

### auth.json

An auth.json file is required with the following format

```
{
	"strava": {
		"club_id": ""
		"client_id": ,
		"client_secret": "",
		"access_token": "",
		"refresh_token": ""
	},
	"slack": {
		"enabled": true|false,
		"debug": true|false
		"channel_id": "",
		"token": ""
	}
}
```