import Freezer from '../Freezer/freezer';
import { Icon, Select, Input, Button } from 'antd'

import './json-editor.less';

const Option = Select.Option;
/****************
 Helper functions
 *****************/

// Guess the type given a value to create the proper attribute
var guessType = function( value ){
    var type = typeof value;

    if( type != 'object' )
        return type;

    if( value instanceof Array )
        return 'array';

    if( value instanceof Date)
        return 'date';

    return 'object';
};

// Default values to initialize attributes
var typeDefaultValues = {
    string: '',
    number: 0,
    object: {},
    array: []
};

/**
 * Creates an specific attribute component depending on
 * the value given
 * @param  {Mixed} value    The value for the attribute
 * @param  {Mixed} original The value of the attribute on the original json
 * @param  {FreezerNode} parent   The parent node is needed to let the attribute update
 * @param  {String} attrkey      The key for the attribute.
 * @return {ReactComponent}  A react component to edit the attribute.
 */
var createAttribute = function( props ){
    var {value, original, attrkey} = props;
    var type = guessType( value ),
        attrConstructor = LeafAttribute;

    if( type == 'object' )
        attrConstructor = ObjectAttribute;
    else if( type == 'array' )
        attrConstructor = ArrayAttribute;

    var attrProps = {
        ...props,
        type,
        attrkey: typeof attrkey != 'undefined' ? attrkey : '',
        original: original
    };

    return React.createElement( attrConstructor, attrProps);
};


/****************
 JSX components
 *****************/

/**
 * The main component. It will refresh the props when the store changes.
 *
 * @param  {FreezerNode} store  Freezer node that contains a json property with the data
 * @param  {FreezerNode} original Freezer node to compare with the current data
 */
var DocEditor = React.createClass({
    getInitialState: function(){
        var { data, onUpdate } = this.props;

        this.frozen = new Freezer(data);
        this.original = this.frozen.get();
        var listener = this.frozen.get().getListener();

        listener.on('update', updated => {
            this.setState({
                jsonStore: this.frozen.get()
            });
            onUpdate && onUpdate(this.frozen.get());

        });
        return {
            jsonStore: this.frozen.get()
        }

    },
    render: function(){
        return (
            <div className="docEditor">
                <Attribute attrkey="配置" value={ this.state.jsonStore } original={ this.original }/>
            </div>
        );
    }
});

/**
 * Attribute component that represent each Array element or Object property.
 * @param  {string} attrkey The key of the attribute in the parent.
 * @param  {Mixed} value The value of the attribute.
 * @param {Mixed} original The value of the attibute in the original json to highlight the changes.
 * @param {FreezerNode} parent The parent node to notify attribute updates.
 */
var Attribute = React.createClass({
    render: function(){
        var me = this;
        var modified = this.props.value != this.props.original;
        function attrTitle(props){
            return (
                <span className="attrTitle" >
                    {me.props.parent ? <a href="#" className="attrRemove" onClick={ me.handleRemove.bind(me) }><Icon type="close-circle"/></a> : null}
                    <span className="attrName">{me.props.attrkey }:</span>
                    {props.children}
                </span>
            )
        }

        return createAttribute({
            ...this.props,
            modified,
            attrTitle: attrTitle,
            handleRemove: this.handleRemove
        });
    },

    handleRemove: function( e ){
        e.preventDefault();
        if(!this.props.parent) return;
        if( this.props.parent.constructor == Array )
            this.props.parent.splice( this.props.attrkey, 1 );
        else
            this.props.parent.remove( this.props.attrkey );
    },

    shouldComponentUpdate: function( nextProps, nextState ){
        return nextProps.value != this.props.value ||
            nextProps.parent != this.props.parent ;
    }
});

/**
 * Component for editing a hash.
 * @param  {FreezerNode} value The value of the object.
 * @param  {Mixed} original The value of the component it the original json.
 */
var ObjectAttribute = React.createClass({
    getInitialState: function(){
        return {
            editing: true
        };
    },

    render: function(){
        var keys = Object.keys( this.props.value ),
            className = ['attribute compoundAttr objectAttr', this.state.editing ? 'open' : '', this.props.modified ? 'modified' : ''].join(' '),
            openHash = '';

        var attrs = [];
        for( var attr in this.props.value ){
            attrs.push(
                <Attribute
                    parent={ this.props.value }
                    value={this.props.value[attr]}
                    original={ this.props.original && this.props.original[attr]}
                    key={ attr }
                    attrkey={ attr }
                />
            );
        }

        openHash = (
            <div className="attrChildren">
                { attrs }
                <AttributeCreator type="attribute" parent={ this.props.value } />
            </div>
        );
        return (
            <div className={ className } >
                {
                    this.props.attrTitle ?
                        React.createElement(this.props.attrTitle, {
                            children: <span onClick={ this.toggleEditing } className="hashToggle">Map [{ keys.length }]</span>
                        })
                        :
                        (
                            <span>
                                <span>{this.props.attrkey}</span>
                                <span onClick={ this.toggleEditing } className="hashToggle">Map [{ keys.length }]</span>
                            </span>
                        )
                }
                {openHash}
            </div>
        );
    },
    toggleEditing: function(){
        this.setState({ editing: !this.state.editing });
    }
});

/**
 * Component for editing an array.
 * @param  {FreezerNode} value The value of the array.
 * @param  {Mixed} original The value of the component it the original json.
 */
var ArrayAttribute = React.createClass({
    getInitialState: function(){
        return {
            editing: true
        };
    },

    render: function(){
        var keys = Object.keys( this.props.value ),
            className = ['attribute compoundAttr arrayAttr', this.state.editing ? 'open' : '', this.props.modified ? 'modified' : ''].join(' '),
            openArray = '';

        var attrs = [];
        for (var i = 0; i < this.props.value.length; i++) {
            attrs.push(
                <Attribute
                    parent={ this.props.value }
                    value={this.props.value[i]}
                    original={this.props.original && this.props.original[i]}
                    key={ i }
                    attrkey={ i }
                />
            );
        }

        openArray = (
            <div className="attrChildren">
                { attrs }
                <AttributeCreator type="element" parent={ this.props.value } attrkey={ keys.length }/>
            </div>
        );

        return (
            <div className={ className }>
                {React.createElement(this.props.attrTitle, {
                    children: <span onClick={this.toggleEditing} className="hashToggle">List [{keys.length}]</span>
                })}
                {openArray}
			</div>
        );
    },
    toggleEditing: function(){
        this.setState({editing: !this.state.editing});
    }
});


/**
 * Component for editing a string.
 * @param  {string} value The value of the string.
 * @param  {Mixed} original The value of the component it the original json.
 * @param {FreezerNode} parent The parent node to let the string component update its value.
 */
var LeafAttribute = React.createClass({
    getInitialState: function(){
        let { type, value, parent, original, attrkey } = this.props;
        return {
            editing: original == undefined, // 若本来没有该属性,说明是新创建的,应为editing状态(input为focus状态)
            value: value,
            modified: value !== original
        };
    },

    render: function(){
        var className = ['attribute leafAttr', this.props.type, this.state.modified ? 'modified' : ''].join(' ');
        var attrVal;

        if( !this.state.editing )
            attrVal = <span className="attrValue" >{ this.props.value }</span>;
        else
            attrVal = <Input value={ this.state.value } onChange={ this.updateValue } onBlur={ this.setValue } ref={node => {this.input = node}} onKeyDown={this.handleKeyDown} />;

        return (
            <div className={className} onClick={this.setEditMode}>
                {React.createElement(this.props.attrTitle, {
                    children: null
                })}
                {attrVal}
            </div>
        )
    },

    componentDidUpdate: function( prevProps, prevState ){
        if( this.state.editing && ! prevState.editing ){
            var node = this.input;
            node.focus();
            node.value = node.value;
        }
    },

    componentDidMount: function(){
        if( this.state.editing ){
            var node = this.input;
            node.focus();
            node.value = node.value;
        }
    },

    setEditMode: function(){
        this.setState({editing: true});
    },

    setValue: function(){
        if( this.state.modified )
            this.props.parent.set( this.props.attrkey, this.state.value );

        this.setState({editing: false});
    },

    updateValue: function( e ){
        var val = e.target.value;
        if(this.props.type === 'number') 
            val = +val;
        this.setState({value: val, modified: val != this.props.value });
    },

    handleKeyDown: function( e ){
        if( e.which == 13 )
            this.setValue();
    }
});

/**
 * Component to add attributes to a Hash or Array.
 * @param  {FreezerNode} root The parent to add the attribute.
 * @param  {string} attrkey Optional. If provided, the attribute added will have that key (arrays).
 *                           Otherwise an input will be shown to let the user define the key.
 */
var AttributeCreator = React.createClass({
    getInitialState: function(){
        return {
            creating: false,
            attrkey: this.props.attrkey,
            type: 'string'
        };
    },

    render: function(){
        if( !this.state.creating )
            return <a className="addAttr" href="#" onClick={this.handleCreate} onMouseOver={e => e.stopPropagation()}><Icon type="plus-circle"/>&nbsp; Add {this.props.type}</a>;

        var attrName;
        if( typeof this.props.attrkey != 'undefined' )
            attrName = <span className="attrName">{this.props.attrkey}:</span>;
        else {
            attrName = <Input  ref={node => {this.keyInput = node}} type="text" placeholder="Attribute name" value={this.state.attrkey} onChange={this.changeKey}/>
        }

        return (
            <div className="hashAttribute">
                { attrName }
                <Select value={this.state.type} onSelect={ this.changeType } ref={node => {this.typeSelector = node}} style={{marginLeft: '5px'}}>
                    <Option value="string">String</Option>
                    <Option value="number">Number</Option>
                    <Option value="array">List</Option>
                    <Option value="object">Map</Option>
                </Select>
                
                <Button onClick={ this.createAttribute } style={{marginLeft: '10px'}}>OK</Button>
                <Button href="#" className="cancelAttr" onClick={ this.handleCancel } style={{marginLeft: '5px'}}>Cancel</Button>
            </div>
        );
    },

    componentDidUpdate: function( prevProps, prevState){
        if( !prevState.creating && this.state.creating ){
            if( this.keyInput )
                this.keyInput.focus();
        }
    },

    componentWillReceiveProps: function( newProps ){
        this.setState({attrkey: newProps.attrkey});
    },

    handleCreate: function( e ){
        e.preventDefault();
        this.setState({creating: true});
    },

    handleCancel: function( e ){
        e.preventDefault();
        this.setState({creating: false});
    },

    changeType: function( type ){
        this.setState({type});
    },

    changeKey: function( e ){
        this.setState({attrkey: e.target.value});
    },

    createAttribute: function(){

        this.setState({creating: false});

        var parent = this.props.parent,
            value = typeDefaultValues[ this.state.type ];

        if( parent.constructor == Array )
            parent.push( value );
        else
            parent.set(this.state.attrkey, value );
    }
});

export default DocEditor
