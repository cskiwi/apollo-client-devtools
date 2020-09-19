/** @jsx jsx */
import { jsx } from "@emotion/core";
import React from "react";
import { render } from "react-dom";
import { ApolloClient, ApolloProvider, InMemoryCache, ApolloLink , useQuery, gql, makeVar } from "@apollo/client";
import "@apollo/space-kit/reset.css";
import { AlertBanner } from "@apollo/space-kit/AlertBanner";

// import Panel from './components/Panel';

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        queries() {
          return queriesVar();
        },
        mutations() {
          return mutationsVar();
        },
        cache() {
          return cacheVar();
        }
      }
    }
  }
});

const queriesVar = makeVar(null);
const mutationsVar = makeVar(null);
const cacheVar = makeVar(null);

const client = new ApolloClient({
  cache,
});

export const writeData = ({ queries, mutations, cache }) => {
  queriesVar(queries);
  mutationsVar(mutations);
  cacheVar(cache);
};

const GET_CACHE = gql`
  query GetCache {
    mutations @client
    queries @client
    cache @client
  }
`;

const App = () => {
  const { data, loading, error } = useQuery(GET_CACHE);
  return (
    <AlertBanner type="info" css={{ margin: '10px' }}>
      Hello, I am the Apollo Client Devtools.
    </AlertBanner>
  )
};

export const initDevTools = () => {
  render(
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>,
    document.getElementById("app")
  );
};
