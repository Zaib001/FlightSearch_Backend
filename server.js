const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and JSON request parsing
app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests

// Endpoint for InstaFlights Search API
app.post("/flights/search", async (req, res) => {
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    stops,
    passengers,
    searchType, // New parameter to identify the type of search
    vendorCode,
    baggage,
  } = req.body;

  let requestPayload;

  // Construct the request payload based on the searchType
  switch (searchType) {
    case "roundTripAdult":
      // Example 1: Round-Trip for Adult Passenger
      requestPayload = {
        OTA_AirLowFareSearchRQ: {
          Version: "5",
          POS: {
            Source: [
              {
                PseudoCityCode: "JT4L",
                RequestorID: {
                  Type: "1",
                  ID: "1",
                  CompanyName: {
                    Code: "TN",
                  },
                },
              },
            ],
          },
          OriginDestinationInformation: [
            {
              DepartureDateTime: departureDate,
              OriginLocation: {
                LocationCode: origin,
              },
              DestinationLocation: {
                LocationCode: destination,
              },
            },
            {
              DepartureDateTime: returnDate,
              OriginLocation: {
                LocationCode: destination,
              },
              DestinationLocation: {
                LocationCode: origin,
              },
            },
          ],
          TravelPreferences: {
            MaxStopsQuantity: stops, // Number of allowed stops
            VendorPref: [], // Allow all airlines
          },
          TravelerInfoSummary: {
            AirTravelerAvail: [
              {
                PassengerTypeQuantity: [
                  {
                    Code: "ADT",
                    Quantity: passengers,
                  },
                ],
              },
            ],
          },
          TPA_Extensions: {
            IntelliSellTransaction: {
              RequestType: {
                Name: "50ITINS",
              },
            },
          },
        },
      };

      break;

    case "roundTripChildAndBaggage":
      // Example 2: Round-Trip with Child and Baggage
      requestPayload = {
        OTA_AirLowFareSearchRQ: {
          Version: "5",
          POS: {
            Source: [
              {
                PseudoCityCode: "JT4L",
                RequestorID: {
                  Type: "1",
                  ID: "1",
                  CompanyName: { Code: "TN" },
                },
              },
            ],
          },
          OriginDestinationInformation: [
            {
              DepartureDateTime: departureDate,
              OriginLocation: { LocationCode: origin },
              DestinationLocation: { LocationCode: destination },
            },
            {
              DepartureDateTime: returnDate,
              OriginLocation: { LocationCode: destination },
              DestinationLocation: { LocationCode: origin },
            },
          ],
          TravelPreferences: {
            MaxStopsQuantity: stops,
            Baggage: { RequestType: "C", Description: baggage || true },
          },
          TravelerInfoSummary: {
            AirTravelerAvail: [
              {
                PassengerTypeQuantity: [
                  { Code: "ADT", Quantity: 1 },
                  { Code: "C06", Quantity: 1 },
                ],
              },
            ],
            PriceRequestInformation: { TPA_Extensions: {} },
          },
          TPA_Extensions: {
            IntelliSellTransaction: {
              RequestType: { Name: "50ITINS" },
            },
          },
        },
      };
      break;

    case "roundTripFamily":
      // Example 3: Round-Trip for a Family with an Infant
      requestPayload = {
        OTA_AirLowFareSearchRQ: {
          Version: "5",
          POS: {
            Source: [
              {
                PseudoCityCode: "JT4L",
                RequestorID: {
                  CompanyName: { Code: "TN" },
                  ID: "1",
                  Type: "1",
                },
              },
            ],
          },
          OriginDestinationInformation: [
            {
              DepartureDateTime: departureDate,
              DestinationLocation: { LocationCode: destination },
              OriginLocation: { LocationCode: origin },
            },
            {
              DepartureDateTime: returnDate,
              DestinationLocation: { LocationCode: origin },
              OriginLocation: { LocationCode: destination },
            },
          ],
          TravelPreferences: {
            MaxStopsQuantity: stops,
            VendorPref: [],
          },
          TravelerInfoSummary: {
            AirTravelerAvail: [
              {
                PassengerTypeQuantity: [
                  {
                    Code: "ADT",
                    Quantity: 2,
                    TPA_Extensions: {
                      VoluntaryChanges: {
                        Match: "All",
                        Penalty: [{ Type: "Refund" }],
                      },
                    },
                  },
                  {
                    Code: "C06",
                    Quantity: 1,
                    TPA_Extensions: {
                      VoluntaryChanges: {
                        Match: "All",
                        Penalty: [{ Type: "Refund" }],
                      },
                    },
                  },
                  {
                    Code: "INF",
                    Quantity: 1,
                    TPA_Extensions: {
                      VoluntaryChanges: {
                        Match: "All",
                        Penalty: [{ Type: "Refund" }],
                      },
                    },
                  },
                ],
              },
            ],
          },
          TPA_Extensions: {
            IntelliSellTransaction: {
              RequestType: { Name: "50ITINS" },
            },
          },
        },
      };
      break;

    default:
      return res.status(400).json({ message: "Invalid search type" });
  }

  // Send request to Sabre API and handle response
  try {
    const response = await axios.post(
      "https://api.cert.platform.sabre.com/v5/offers/shop",
      requestPayload,
      {
        headers: {
          Authorization: `Bearer T1RLAQIZZvlmkHtqpgeoRkk1x6qMG0UjbLXvA2kItac17EYbpBDGsHPLQYQuHeNWndl7bMAmAADgkAOGXF76tI2plUJ/pp1yQF7lwCyIJwBRhIFLpF0vFjK1KcKNCwPQlF86Om8f00Kp/lZbCvLeGzenjtcSg9VWKQXibDHDWiQNFhUzfin7NkH8ymvIFE8YW763GwXhCnLaIwWlMfCi/MoeJXojWV06GMZvNCsHVOushhic/Uuk954MbpvTpmXm62lr4jNFNB7OWq9AaAY0A8DLBbYS+eLI1gSjWRCtXR9wBzEMIOkMAyOfxdkSGPuYlf73QqDBiF4n839TCl4md31VKRl2I3WKyCoL5Yn/CSHsmg++Kws+/fk*`, // Replace with your actual token
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    // Process the response data
    const itineraries =
      response.data.groupedItineraryResponse.scheduleDescs || [];
    const formattedItineraries = itineraries.map((itinerary) => ({
      departureTime: itinerary.departure.time,
      arrivalTime: itinerary.arrival.time,
      departureAirport: itinerary.departure.airport,
      arrivalAirport: itinerary.arrival.airport,
      carrier: itinerary.carrier.marketing,
      flightNumber: itinerary.carrier.marketingFlightNumber,
    }));
    const itineraryGroups =
      response.data.groupedItineraryResponse.itineraryGroups || [];
    const formattedPrices = itineraryGroups.flatMap((group) =>
      group.itineraries.flatMap((itinerary) =>
        itinerary.pricingInformation.map((pricingInfo) => ({
          totalPrice: pricingInfo.fare.totalFare.totalPrice,
          currency: pricingInfo.fare.totalFare.currency,
          pricingSource: group.pricingSource,
        }))
      )
    );

    // Send the formatted response to the client
    res.json({
      itineraries: formattedItineraries,
      prices: formattedPrices,
      statistics: response.data.groupedItineraryResponse.statistics,
    });
  } catch (error) {
    console.error(
      "Error retrieving flight data:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ message: "Error retrieving flight data" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
