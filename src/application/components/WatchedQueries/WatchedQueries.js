import PropTypes from "prop-types";
import React from "react";
import pickBy from "lodash.pickby";
import sortBy from "lodash.sortby";
import classnames from "classnames";
import { getOperationName } from "apollo-utilities";
import { parse } from "graphql/language/parser";
import { print } from "graphql/language/printer";
import { GraphqlCodeBlock } from "graphql-syntax-highlighter-react";
import { Sidebar } from "../Sidebar";
import Warning from "../Images/Warning";

const queryLabel = (queryId, query) => {
  let queryName;

  if (query.queryString) {
    // Parse the query string, then extract the query name.
    queryName = getOperationName(parse(query.queryString));
  } else if (query.document) {
    // The query string has already been parsed (e.g. using `graphql-tag`)
    // so extract the query name from the parsed document.
    queryName = getOperationName(query.document);
  }

  // If we haven't been able to find the query name, make one last
  // attempt to parse and pull it from the source of a document
  // (if it exsts).
  if (!queryName && query.document && query.document.loc && query.document.loc.source && query.document.loc.source.body) {
    queryName = getOperationName(parse(query.document.loc.source.body));
  }

  // If the query name can't be extracted, fallback on the query ID as the
  // label.
  return queryName || queryId;
};

class WatchedQueries extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      selectedId: null,
    };
  }

  selectId(id) {
    this.setState({ selectedId: id });
  }

  getQueries() {
    return this.props.state
      ? pickBy(this.props.state.queries, query => !query.stopped)
      : {};
  }

  sortedQueryIds() {
    const queries = this.getQueries();
    return sortBy(Object.keys(queries), id => parseInt(id, 10));
  }

  renderSidebarItem(id, query) {
    let className = "item";
    const hasError =
      query.networkError ||
      (query.graphQLErrors && query.graphQLErrors.length > 0);
    return (
      <li
        key={id}
        onClick={() => this.selectId(id)}
        className={classnames("item", {
          active: id === this.state.selectedId,
          loading: query.loading,
          error: hasError,
        })}
      >
        <div className="item-row">
          <h4>{queryLabel(id, query)}</h4>
          {hasError && (
            <span className="error-icon">
              <Warning />
            </span>
          )}
        </div>
      </li>
    );
  }

  render() {
    const queries = this.getQueries();
    const { selectedId } = this.state;
    return (
      <div className="watchedQueries body">
        <Sidebar className="sidebar" name="watched-queries-sidebar">
          <h4 className="queries-sidebar-title">Watched queries</h4>
          <ol className="query-list">
            {this.sortedQueryIds().map(id =>
              this.renderSidebarItem(id, queries[id]),
            )}
          </ol>
        </Sidebar>
        {selectedId && queries[selectedId] && (
          <WatchedQuery
            queryId={selectedId}
            query={queries[selectedId]}
            onRun={this.props.onRun}
          />
        )}
      </div>
    );
  }
}

WatchedQueries.propTypes = {
  state: PropTypes.object,
};

class LabeledShowHide extends React.Component {
  constructor(props, context) {
    super(props, context);
    const { show = true } = props;
    this.state = { show };
    this.toggle = this.toggle.bind(this);
  }
  toggle() {
    this.setState(({ show }) => ({ show: !show }));
  }
  render() {
    return (
      <div className={classnames(this.props.className, "toggled-section")}>
        <span onClick={this.toggle} className="toggle">
          <span
            className={classnames("triangle", { toggled: !this.state.show })}
          >
            &#9662;
          </span>
          <span className="section-label">{this.props.label}</span>
        </span>
        {this.state.show && (
          <div className="labeled">{this.props.children}</div>
        )}
      </div>
    );
  }
}
LabeledShowHide.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.any.isRequired,
  show: PropTypes.bool,
};

const Variables = ({ variables }) => {
  if (!variables) {
    return null;
  }
  const inner = [];
  Object.keys(variables)
    .sort()
    .forEach(name => {
      inner.push(
        <tr key={`tr-${name}`}>
          <td key={`dt-${name}`}>{name}</td>
          <td key={`dd-${name}`}>{JSON.stringify(variables[name])}</td>
        </tr>,
      );
    });
  return (
    <table>
      <tbody>{inner}</tbody>
    </table>
  );
};

const GraphQLError = ({ error }) => (
  <li className="graphql-error">
    {error.message && <span>{error.message}</span>}
  </li>
);
GraphQLError.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
  }),
};

class WatchedQuery extends React.Component {
  render() {
    const { queryId, query } = this.props;
    const reactComponentDisplayName =
      query &&
      query.metadata &&
      query.metadata.reactComponent &&
      query.metadata.reactComponent.displayName;
    const componentDisplayName =
      query &&
      query.metadata &&
      query.metadata.component &&
      query.metadata.component.displayName;
    const displayName = componentDisplayName || reactComponentDisplayName;

    const queryString = query.queryString || print(query.document);

    return (
      <div className={classnames("main", { loading: query.loading })}>
        <div className="panel-title">
          {queryLabel(queryId, query)}
          {displayName && (
            <span className="component-name">{`<${displayName}>`}</span>
          )}
          <span
            className="run-in-graphiql-link"
            onClick={() =>
              this.props.onRun(
                queryString,
                query.variables,
                "WatchedQueries",
                true,
              )
            }
          >
            Run in GraphiQL
          </span>
          <span
            className={classnames("loading-label", { show: query.loading })}
          >
            (loading)
          </span>
        </div>
        {query.variables && (
          <LabeledShowHide label="Variables">
            <Variables variables={query.variables} />
          </LabeledShowHide>
        )}
        <LabeledShowHide label="Query string" show={false}>
          <GraphqlCodeBlock
            className="GraphqlCodeBlock"
            queryBody={queryString}
          />
        </LabeledShowHide>
        {query.graphQLErrors && query.graphQLErrors.length > 0 && (
          <LabeledShowHide
            label="GraphQL Errors"
            show={query.graphQLErrors && query.graphQLErrors.length > 0}
          >
            <ul>
              {query.graphQLErrors.map((error, i) => (
                <GraphQLError key={i} error={error} />
              ))}
            </ul>
          </LabeledShowHide>
        )}
        {query.networkError && (
          <LabeledShowHide label="Network Errors" show={!!query.networkError}>
            <pre>
              There is a network error: {JSON.stringify(query.networkError)}
            </pre>
          </LabeledShowHide>
        )}
      </div>
    );
  }
}

export default WatchedQueries;
