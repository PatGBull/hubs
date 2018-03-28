import React, { Component } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import queryString from "query-string";
import { IntlProvider, injectIntl, FormattedMessage, addLocaleData } from "react-intl";
import en from "react-intl/locale-data/en";
import homeVideo from "../assets/video/home.webm";

import HubCreatePanel from "./hub-create-panel.js";

const navigatorLang = (navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage;

const lang = navigatorLang.toLowerCase().split(/[_-]+/)[0];

import localeData from "../assets/translations.data.json";
addLocaleData([...en]);

const messages = localeData[lang] || localeData.en;

const ENVIRONMENT_URLS = [
  `${document.location.protocol}//${document.location.host}/assets/environments/cliff_meeting_space/bundle.json`
];

class HomeRoot extends Component {
  static propTypes = {
    intl: PropTypes.object
  };

  state = {
    environments: []
  };

  componentDidMount() {
    this.loadEnvironments();
    document.querySelector("#background-video").playbackRate = 0.5;
  }

  loadEnvironments = () => {
    const environments = [];

    const environmentLoads = ENVIRONMENT_URLS.map(
      src =>
        new Promise(async resolve => {
          const res = await fetch(src);
          const data = await res.json();
          data.bundle_url = src;
          environments.push(data);
          resolve();
        })
    );

    Promise.all(environmentLoads).then(() => this.setState({ environments }));
  };

  render() {
    return (
      <IntlProvider locale={lang} messages={messages}>
        <div>
          <video playsInline autoPlay muted loop className="background-video" id="background-video">
            <source src={homeVideo} type="video/webm" />
          </video>
          <div className="main-content">
            {this.state.environments.length > 0 && <HubCreatePanel environments={this.state.environments} />}
          </div>
        </div>
      </IntlProvider>
    );
  }
}

export default HomeRoot;