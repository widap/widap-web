# Parses config settings used for various Python scripts, e.g. AWS username/
# password information needed for querying the SQL tables, etc. Such information
# should not be stored in version control, hence the need for configuration.

import configparser

def getcfg(filename='aws_mysql.cfg', section='aws-mysql'):
    """Returns configuration data from the given file as a dict."""
    parser = configparser.ConfigParser()
    parser.read(filename)
    if parser.has_section(section):
        return {param[0]: param[1] for param in parser.items(section)}
    else:
        raise RuntimeError(
            'Section {0} not found in the {1} file'.format(section, filename))
    return opts
