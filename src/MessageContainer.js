import PropTypes from 'prop-types';
import React from 'react';
import * as R from 'ramda';

import {
  FlatList,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import shallowequal from 'shallowequal';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'
// import InvertibleScrollView from 'react-native-invertible-scroll-view';
import md5 from 'md5';
import LoadEarlier from './LoadEarlier';
import Message from './Message';

export default class MessageContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showScrollBottom: false,
      hasScrolled: false,
    }
    this.renderRow = this.renderRow.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.renderLoadEarlier = this.renderLoadEarlier.bind(this);
    // this.renderScrollComponent = this.renderScrollComponent.bind(this);

    // const dataSource = new ListView.DataSource({
    //   rowHasChanged: (r1, r2) => {
    //     return r1.hash !== r2.hash;
    //   }
    // });

    // const messagesData = this.prepareMessages(props.messages);
    this.state = {
      data: this.prepareMessages(R.clone(props.messages)),
      // dataSource: dataSource.cloneWithRows(messagesData.blob, messagesData.keys)
    };
  }

  prepareMessages(messages) {
    return messages.reduce((o, m, i) => {
      const previousMessage = messages[i + 1] || {};
      const nextMessage = messages[i - 1] || {};
      // add next and previous messages to hash to ensure updates
      const toHash = JSON.stringify(m) + previousMessage._id + nextMessage._id;
      o.push({
        ...m,
        previousMessage,
        nextMessage,
        hash: md5(toHash)
      });
      return o;
    }, []);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (!shallowequal(this.props, nextProps)) {
      return true;
    }
    if (!shallowequal(this.state, nextState)) {
      return true;
    }
    return false;
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.messages === nextProps.messages) {
      return;
    }

    this.setState({
      data: this.prepareMessages(R.clone(nextProps.messages)),
      // dataSource: this.state.dataSource.cloneWithRows(messagesData.blob, messagesData.keys)
    });
  }

  renderFooter() {
    if (this.props.renderFooter) {
      const footerProps = {
        ...this.props,
      };
      return this.props.renderFooter(footerProps);
    }
    return null;
  }

  renderLoadEarlier() {
    if (this.props.loadEarlier === true) {
      const loadEarlierProps = {
        ...this.props,
      };
      if (this.props.renderLoadEarlier) {
        return this.props.renderLoadEarlier(loadEarlierProps);
      }
      return (
          <LoadEarlier {...loadEarlierProps}/>
      );
    }
    return null;
  }

  scrollToOffset(options) {
    this._invertibleScrollViewRef.scrollToOffset(options);
  }

  scrollToEnd(options) {
    this._invertibleScrollViewRef.scrollToEnd({animated: options.animated, duration: 100 });
  }

  scrollToBottom = (animated = true) => {
    this.scrollToOffset({ offset: 0, animated })
  }

  handleOnScroll = (event) => {
    const {
      nativeEvent: {
        contentOffset: { y: contentOffsetY },
        contentSize: { height: contentSizeHeight },
        layoutMeasurement: { height: layoutMeasurementHeight },
      },
    } = event
    const { scrollToBottomOffset } = this.props
    if (contentOffsetY > scrollToBottomOffset) {
      this.setState({ showScrollBottom: true, hasScrolled: true })
    } else {  
      this.setState({ showScrollBottom: false, hasScrolled: true })
    }
  }

  renderScrollToBottomWrapper() {
    const propsStyle = this.props.scrollToBottomStyle || {}
    return (
      <View style={[styles.scrollToBottomStyle, propsStyle]}>
        <TouchableOpacity
          onPress={() => this.scrollToBottom()}
          hitSlop={{ top: 5, left: 5, right: 5, bottom: 5 }}
        >
          <MaterialIcon
            name='keyboard-arrow-down'
            size={25}
            color="white"
          />
        </TouchableOpacity>
      </View>
    )
  }

  renderRow(item) {
    const message = item.item;

    if (!message._id && message._id !== 0) {
      console.warn('GiftedChat: `_id` is missing for message', JSON.stringify(message));
    }
    if (!message.user) {
      if (!message.system) {
        console.warn("GiftedChat: `user` is missing for message", JSON.stringify(message));
      }
      message.user = {};
    }

    const messageProps = {
      ...this.props,
      key: message._id,
      currentMessage: message,
      previousMessage: message.previousMessage,
      nextMessage: message.nextMessage,
      position: message.user._id === this.props.user._id ? 'right' : 'left',
    };

    if (this.props.renderMessage) {
      return this.props.renderMessage(messageProps);
    }
    return <Message {...messageProps}/>;
  }

  componentDidMount() {
    // console.log('MessageContainer componentDidMount')
    // setTimeout(() => {
    //   this.scrollToEnd({
    //     animated: true
    //   })
    // }, 250)

  }

  // renderScrollComponent(props) {
  //   const invertibleScrollViewProps = this.props.invertibleScrollViewProps;
  //   return (
  //     <InvertibleScrollView
  //       {...props}
  //       {...invertibleScrollViewProps}
  //       ref={component => this._invertibleScrollViewRef = component}
  //     />
  //   );
  // }

  render() {
    return (
        <View
            ref='container'
            style={styles.container}
        >
          {this.state.showScrollBottom
          ? this.renderScrollToBottomWrapper()
          : null}
          <FlatList
              style={{ paddingTop: 10, paddingBottom: 10 }}
              data={this.state.data}
              renderItem={this.renderRow}
              ListHeaderComponent={this.renderFooter}
              ListFooterComponent={this.renderLoadEarlier}
              // renderScrollComponent ={this.renderScrollComponent}
              ref={(ref) => { this._invertibleScrollViewRef = ref; }}
              enableEmptySections={true}
              automaticallyAdjustContentInsets={false}
              initialListSize={20}
              pageSize={20}
              inverted={true}
              onScroll={this.handleOnScroll}
              keyExtractor={(m)=>{
                return m._id;
              }}
              {...this.props.listViewProps}
          />
        </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollToBottomStyle: {
    opacity: 0.8,
    position: 'absolute',
    right: 10,
    bottom: 30,
    zIndex: 999,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#0068ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'white',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 1,
  },
});

MessageContainer.defaultProps = {
  messages: [],
  user: {},
  renderFooter: null,
  renderMessage: null,
  scrollToBottomOffset: 200,
  onLoadEarlier: () => {
  },
};

MessageContainer.propTypes = {
  messages: PropTypes.array,
  user: PropTypes.object,
  renderFooter: PropTypes.func,
  renderMessage: PropTypes.func,
  onLoadEarlier: PropTypes.func,
  listViewProps: PropTypes.object,
  scrollToBottomOffset: PropTypes.number,
};
